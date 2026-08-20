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

## Deployment

The site is made of static files and can be hosted on Cloudflare Pages or another static host. Configure the production platform only when you are ready to publish; no Cloudflare configuration is included in this first version.
