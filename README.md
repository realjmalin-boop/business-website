# Northline Studio website

A polished, dependency-free multi-page website for a small-business web design studio. The project uses semantic HTML, shared CSS and a small amount of vanilla JavaScript, so it is quick to run and straightforward to deploy.

## Run locally

1. Install Node.js 18 or newer.
2. From this folder, run `npm run dev`.
3. Visit [http://127.0.0.1:4173](http://127.0.0.1:4173).

No package installation is required because the local server uses only built-in Node.js modules.

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

The quote form is intentionally frontend-only. Its submit handler is isolated in `assets/js/main.js` and can later be replaced with a request to an email provider, form service or custom backend.

## Cloudflare Workers deployment

The site is configured for Cloudflare Workers Static Assets using Wrangler. The deployment build copies only the public website into `dist/`; local server files and project configuration are not uploaded as website assets.

1. Run `npm install` if dependencies are not installed yet.
2. Run `npm run build` to prepare `dist/`.
3. Run `npx wrangler deploy` and follow Wrangler's Cloudflare sign-in prompt if needed.

`npx wrangler deploy` automatically runs the build command defined in `wrangler.jsonc`. The `auto-trailing-slash` setting preserves routes such as `/about/` and `/services/`, while `404-page` serves the existing custom `404.html` for missing pages.

For a Cloudflare-flavored local preview, run `npm run preview:cloudflare`. The original `npm run dev` workflow remains unchanged at `http://127.0.0.1:4173`.
