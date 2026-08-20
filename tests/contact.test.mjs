import assert from "node:assert/strict";
import test from "node:test";

import { handleContact } from "../src/worker.mjs";

const endpoint = "http://localhost/api/contact";
const testEnvironment = {
  RESEND_API_KEY: "test-resend-key",
  CONTACT_TO_EMAIL: "owner@example.com",
  CONTACT_FROM_EMAIL: "Northline Studio <website@example.com>"
};

const validLead = {
  name: "Jamie Rivera",
  business: "Acme & Sons",
  email: "jamie@example.com",
  phone: "717-555-0100",
  website: "https://example.com",
  projectType: "Website redesign",
  description: "We need a clearer, modern website for our local service business.",
  companyFax: ""
};

function contactRequest(body = validLead, method = "POST", headers = {}) {
  return new Request(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: method === "POST" ? JSON.stringify(body) : undefined
  });
}

test("only POST is accepted", async () => {
  const response = await handleContact(contactRequest(undefined, "GET"), testEnvironment);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

test("malformed JSON is rejected", async () => {
  const request = new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json"
  });
  const response = await handleContact(request, testEnvironment);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("invalid email and website values are rejected", async () => {
  const emailResponse = await handleContact(
    contactRequest({ ...validLead, email: "not-an-email" }),
    testEnvironment
  );
  assert.equal(emailResponse.status, 400);

  const websiteResponse = await handleContact(
    contactRequest({ ...validLead, website: "javascript:alert(1)" }),
    testEnvironment
  );
  assert.equal(websiteResponse.status, 400);
});

test("the honeypot suppresses email delivery", async () => {
  let fetchCalls = 0;
  const mockFetch = async () => {
    fetchCalls += 1;
    return new Response(null, { status: 200 });
  };

  const response = await handleContact(
    contactRequest({ ...validLead, companyFax: "spam value" }),
    testEnvironment,
    mockFetch
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCalls, 0);
});

test("a valid lead is sent to Resend with HTML, text, and reply-to", async () => {
  let requestUrl;
  let requestOptions;
  const mockFetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return Response.json({ id: "test-email-id" });
  };

  const response = await handleContact(
    contactRequest(validLead),
    testEnvironment,
    mockFetch
  );
  const responseBody = await response.json();
  const resendBody = JSON.parse(requestOptions.body);

  assert.equal(response.status, 200);
  assert.equal(responseBody.success, true);
  assert.equal(requestUrl, "https://api.resend.com/emails");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-resend-key");
  assert.match(requestOptions.headers["Idempotency-Key"], /^contact-/);
  assert.equal(resendBody.from, testEnvironment.CONTACT_FROM_EMAIL);
  assert.deepEqual(resendBody.to, [testEnvironment.CONTACT_TO_EMAIL]);
  assert.equal(resendBody.reply_to, validLead.email);
  assert.match(resendBody.html, /Acme &amp; Sons/);
  assert.match(resendBody.html, /Project description/);
  assert.match(resendBody.text, /Website type: Website redesign/);
  assert.match(resendBody.text, /We need a clearer, modern website/);
});

test("Resend failures return a generic browser-safe error", async () => {
  const response = await handleContact(
    contactRequest(validLead),
    testEnvironment,
    async () => Response.json({ message: "provider detail" }, { status: 422 })
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.success, false);
  assert.doesNotMatch(body.message, /provider detail/i);
});
