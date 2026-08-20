const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const MAX_REQUEST_BYTES = 16_000;

const FIELD_LIMITS = {
  name: 100,
  business: 120,
  email: 254,
  phone: 40,
  website: 300,
  projectType: 80,
  description: 5_000,
  companyFax: 120
};

const PROJECT_TYPES = new Set([
  "New small business website",
  "Website redesign",
  "Landing page",
  "Mobile-responsive rebuild",
  "Website maintenance",
  "Not sure yet"
]);

const PUBLIC_MESSAGES = {
  success: "Thanks—your project details have been sent successfully.",
  invalid: "Please check the form and try again.",
  unavailable: "We couldn’t send your message right now. Please try again in a moment."
};

function jsonResponse(body, status = 200, additionalHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...additionalHeaders
    }
  });
}

function normalizeField(value, maximumLength, multiline = false) {
  if (typeof value !== "string") {
    return { value: "", invalidType: value !== undefined && value !== null, tooLong: false };
  }

  if (value.length > maximumLength) {
    return { value: "", invalidType: false, tooLong: true };
  }

  let normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n");

  if (multiline) {
    normalized = normalized
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  } else {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  return { value: normalized, invalidType: false, tooLong: false };
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= FIELD_LIMITS.email &&
    !/[\r\n]/.test(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
  );
}

function isValidWebsite(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function extractMailbox(value) {
  const friendlyAddress = value.match(/<([^<>]+)>$/);
  return friendlyAddress ? friendlyAddress[1].trim() : value;
}

function isValidConfiguredAddress(value) {
  return (
    typeof value === "string" &&
    value.length <= 320 &&
    !/[\r\n]/.test(value) &&
    isValidEmail(extractMailbox(value.trim()))
  );
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, status: 400, message: PUBLIC_MESSAGES.invalid };
  }

  const fields = {
    name: normalizeField(payload.name, FIELD_LIMITS.name),
    business: normalizeField(payload.business, FIELD_LIMITS.business),
    email: normalizeField(payload.email, FIELD_LIMITS.email),
    phone: normalizeField(payload.phone, FIELD_LIMITS.phone),
    website: normalizeField(payload.website, FIELD_LIMITS.website),
    projectType: normalizeField(payload.projectType, FIELD_LIMITS.projectType),
    description: normalizeField(payload.description, FIELD_LIMITS.description, true),
    companyFax: normalizeField(payload.companyFax, FIELD_LIMITS.companyFax)
  };

  if (Object.values(fields).some((field) => field.invalidType || field.tooLong)) {
    return {
      ok: false,
      status: 400,
      message: "One or more fields is invalid or too long. Please review the form and try again."
    };
  }

  if (fields.companyFax.value) {
    return { ok: true, spam: true };
  }

  if (
    fields.name.value.length < 2 ||
    fields.business.value.length < 2 ||
    fields.description.value.length < 10 ||
    !fields.projectType.value
  ) {
    return {
      ok: false,
      status: 400,
      message: "Please complete all required fields before sending."
    };
  }

  if (!isValidEmail(fields.email.value)) {
    return { ok: false, status: 400, message: "Please enter a valid email address." };
  }

  if (fields.phone.value) {
    const phoneDigits = fields.phone.value.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 18) {
      return { ok: false, status: 400, message: "Please enter a valid phone number or leave it blank." };
    }
  }

  if (!isValidWebsite(fields.website.value)) {
    return {
      ok: false,
      status: 400,
      message: "Please enter a complete website address beginning with http:// or https://."
    };
  }

  if (!PROJECT_TYPES.has(fields.projectType.value)) {
    return { ok: false, status: 400, message: "Please choose a valid website type." };
  }

  return {
    ok: true,
    spam: false,
    data: Object.fromEntries(
      Object.entries(fields)
        .filter(([key]) => key !== "companyFax")
        .map(([key, field]) => [key, field.value])
    )
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailRow(label, value, options = {}) {
  const displayValue = value || "Not provided";
  let renderedValue = escapeHtml(displayValue).replaceAll("\n", "<br>");

  if (options.link && value) {
    renderedValue = `<a href="${escapeHtml(value)}" style="color:#a94327;">${escapeHtml(value)}</a>`;
  }

  return `
    <tr>
      <td style="width:180px;padding:12px 18px 12px 0;border-bottom:1px solid #e5ded2;color:#5d6877;font-size:13px;font-weight:700;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e5ded2;color:#172131;font-size:15px;vertical-align:top;">${renderedValue}</td>
    </tr>`;
}

function createEmailContent(lead) {
  const rows = [
    emailRow("Name", lead.name),
    emailRow("Business", lead.business),
    emailRow("Email", lead.email),
    emailRow("Phone", lead.phone),
    emailRow("Existing website", lead.website, { link: true }),
    emailRow("Website type", lead.projectType),
    emailRow("Project description", lead.description)
  ].join("");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f2ea;font-family:Arial,sans-serif;color:#172131;">
    <div style="padding:32px 16px;">
      <div style="max-width:680px;margin:0 auto;overflow:hidden;background:#fffdf8;border-radius:18px;border:1px solid #e5ded2;">
        <div style="padding:30px 34px;background:#171b1c;color:#ffffff;">
          <div style="margin-bottom:10px;color:#ff8c72;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">New website inquiry</div>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.15;">${escapeHtml(lead.business)}</h1>
        </div>
        <div style="padding:26px 34px 34px;">
          <p style="margin:0 0 20px;color:#5d6877;font-size:15px;line-height:1.6;">A new lead submitted the Northline Studio project form.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    "NEW WEBSITE INQUIRY",
    "",
    `Name: ${lead.name}`,
    `Business: ${lead.business}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "Not provided"}`,
    `Existing website: ${lead.website || "Not provided"}`,
    `Website type: ${lead.projectType}`,
    "",
    "Project description:",
    lead.description
  ].join("\n");

  return { html, text };
}

function hasValidConfiguration(env) {
  return (
    typeof env.RESEND_API_KEY === "string" &&
    env.RESEND_API_KEY.trim().length > 0 &&
    isValidConfiguredAddress(env.CONTACT_TO_EMAIL) &&
    isValidConfiguredAddress(env.CONTACT_FROM_EMAIL)
  );
}

export async function handleContact(request, env, fetchImplementation = fetch) {
  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Method not allowed." },
      405,
      { Allow: "POST" }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse(
      { success: false, message: "Please submit the website form to send your message." },
      415
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonResponse(
      { success: false, message: "Your message is too long. Please shorten it and try again." },
      413
    );
  }

  let rawBody;
  let payload;

  try {
    rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse(
        { success: false, message: "Your message is too long. Please shorten it and try again." },
        413
      );
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(
      { success: false, message: "We could not read your submission. Please refresh and try again." },
      400
    );
  }

  const validation = validateSubmission(payload);
  if (!validation.ok) {
    return jsonResponse(
      { success: false, message: validation.message },
      validation.status
    );
  }

  if (validation.spam) {
    return jsonResponse({ success: true, message: PUBLIC_MESSAGES.success });
  }

  if (!hasValidConfiguration(env)) {
    console.error("Contact form email configuration is missing or invalid.");
    return jsonResponse({ success: false, message: PUBLIC_MESSAGES.unavailable }, 503);
  }

  const lead = validation.data;
  const emailContent = createEmailContent(lead);
  const resendPayload = {
    from: env.CONTACT_FROM_EMAIL.trim(),
    to: [env.CONTACT_TO_EMAIL.trim()],
    subject: `New website inquiry — ${lead.business}`,
    reply_to: lead.email,
    html: emailContent.html,
    text: emailContent.text
  };

  let resendResponse;

  try {
    resendResponse = await fetchImplementation(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact-${crypto.randomUUID()}`,
        "User-Agent": "Northline-Studio-Contact-Form/1.0"
      },
      body: JSON.stringify(resendPayload)
    });
  } catch {
    console.error("The Resend request could not be completed.");
    return jsonResponse({ success: false, message: PUBLIC_MESSAGES.unavailable }, 502);
  }

  if (!resendResponse.ok) {
    console.error(`Resend returned status ${resendResponse.status}.`);
    return jsonResponse({ success: false, message: PUBLIC_MESSAGES.unavailable }, 502);
  }

  return jsonResponse({ success: true, message: PUBLIC_MESSAGES.success });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/contact") {
    return handleContact(request, env);
  }

  if (url.pathname.startsWith("/api/")) {
    return jsonResponse({ success: false, message: "API endpoint not found." }, 404);
  }

  if (env.ASSETS?.fetch) {
    return env.ASSETS.fetch(request);
  }

  return new Response("Not found", { status: 404 });
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
