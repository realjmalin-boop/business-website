# Northline Studio website

A polished, dependency-free multi-page website for a small-business web design studio. The project uses semantic HTML, shared CSS and a small amount of vanilla JavaScript, so it is quick to run and straightforward to deploy.

## Run locally

1. Install Node.js 18 or newer.
2. From this folder, run `npm run dev`.
3. Visit [http://127.0.0.1:4173](http://127.0.0.1:4173).

The basic local server uses only built-in Node.js modules. Run `npm install` before using the Cloudflare preview, tests, or deployment commands.

## Pages

- `/` — Home
- `/services/` — Services
- `/portfolio/` — Work
- `/how-it-works/` — Process
- `/about/` — About
- `/contact/` — Contact and quote form
- `/404.html` — Custom not-found page

## Editing the site

- Shared styles: `assets/css/styles.css`
- Navigation, reveal effects and form interaction: `assets/js/main.js`
- Page content: each route has its own `index.html`

The quote form submits JSON to `POST /api/contact`. The Worker validates the submission and sends the lead notification through Resend without exposing credentials to the browser.

## Contact form configuration

The Worker requires three runtime values:

- `RESEND_API_KEY` — a Resend API key; always store this as a Cloudflare secret.
- `CONTACT_TO_EMAIL` — the inbox that should receive new leads.
- `CONTACT_FROM_EMAIL` — a sender on a domain verified in Resend. A friendly sender such as `Northline Studio <website@example.com>` is supported.

### Resend setup

1. Add and verify your sending domain in Resend.
2. Create a Resend API key with permission to send email.
3. Choose a sender address on the verified domain for `CONTACT_FROM_EMAIL`.

### Test the form locally

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Replace the example values with a Resend test key, destination inbox, and verified sender.
3. Run `npm run preview:cloudflare`.
4. Open the local URL printed by Wrangler and submit the contact form.

`.dev.vars` is ignored by Git and is never copied into `dist/`. The original `npm run dev` workflow remains available at `http://127.0.0.1:4173` for static design work; use the Cloudflare preview when testing the form endpoint.

## Cloudflare Workers deployment

The site is configured for Cloudflare Workers Static Assets using Wrangler. The deployment build copies only the public website into `dist/`; local server files and project configuration are not uploaded as website assets.

1. Run `npm install` if dependencies are not installed yet.
2. Run `npm run test` and `npm run build`.
3. Sign in with `npx wrangler login` if needed.
4. Before the first production deployment, create an ignored `.env.production` file containing the same three values shown in `.dev.vars.example`.
5. Run `npx wrangler deploy --secrets-file .env.production` to upload the Worker and configure the required values as encrypted Cloudflare secrets in one operation.

After the secrets exist on the Worker, future updates can use `npx wrangler deploy` normally. You can also manage the three values from the Worker's **Settings → Variables and Secrets** page in Cloudflare; keep `RESEND_API_KEY` configured as a secret.

Wrangler automatically runs the build command defined in `wrangler.jsonc`. The `auto-trailing-slash` setting preserves routes such as `/about/` and `/services/`, while `404-page` serves the existing custom `404.html` for missing pages. Static files remain on Workers Static Assets, and only `/api/*` routes run Worker code first.

The form endpoint returns browser-safe JSON errors, accepts only JSON `POST` requests, validates field lengths and formats, and uses a honeypot to suppress simple bot submissions. No CAPTCHA or contact database is included.
