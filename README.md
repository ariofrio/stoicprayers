# Stoic prayers

A pre-rendered React Router v8 reader for ancient prayers, hymns, and reflections in Greek, Latin, and English. Read it at [stoicprayers.org](https://stoicprayers.org).

## Development

Use the Node version in `.node-version`.

```sh
npm ci
npx playwright install chromium
npm run dev
```

```sh
npm run check
```

The checks cover formatting, TypeScript, content integrity, publication policy, static rendering, and desktop/mobile browser behavior. `npm run build` renders every public route into `build/client`; `npm run preview` serves those files with Wrangler.

## Content

Edit [app/content/prayers.json](app/content/prayers.json) and keep [catalog.json](app/content/catalog.json) synchronized. The small catalogue is the only corpus-wide data included in the browser bundle; complete passages are loaded per route. Read the [content audit](docs/content-audit.md) before changing texts or attribution. The prototype is retained for provenance, and unsupported transcriptions are preserved outside the published reader.

## Deployment

GitHub Actions validates pushes to `main` and PR heads. A separate trusted workflow publishes the successful static artifact. PRs get a persistent Cloudflare version alias and a GitHub Deployment URL; production promotes a tested version. See [deployment operations](docs/deployment.md).
