[![Deploy to GitHub Pages](https://github.com/LucasZeiger/LucasZeiger.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/LucasZeiger/LucasZeiger.github.io/actions/workflows/deploy.yml)
[![Update ORCID publications](https://github.com/LucasZeiger/LucasZeiger.github.io/actions/workflows/update-orcid.yml/badge.svg)](https://github.com/LucasZeiger/LucasZeiger.github.io/actions/workflows/update-orcid.yml)

Personal academic CV website

## Local development and validation

Use Node.js 22.12 or later, then run `npm ci` and `npm run dev`.
The development and build commands generate optimized image assets from the
originals in `data/images/`. Generated images and build output are not committed.

Run `npm run build` and `npm run check:build` before deploying. The build emits
static HTML for the academic pages, route-specific metadata, and a sitemap.
Interactive tool routes get their own entry files and load their code on demand.
Legacy `#/...` links redirect to their corresponding clean paths.

Run `npm run preview` to inspect the production build. To publish manually, use
`npm run deploy`; pushing to `main` also triggers the GitHub Pages workflow.
Standalone embedded apps live under `public/experiments/` so their index files
cannot collide with the site's routes under `/playground/`.
