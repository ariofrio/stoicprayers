# CI and deployment architecture

[Stoic prayers](https://github.com/ariofrio/stoicprayers) uses React Router 8.3.1 Framework Mode, build-time pre-rendering, GitHub Actions, and Cloudflare Workers Static Assets. Node 22.23.2 and dependency versions are pinned. No request-time server, database, or application secrets are needed.

## Rendering

[react-router.config.ts](../react-router.config.ts) pre-renders the collection, the editorial introduction, and 22 stable `/prayers/<id>` routes. Build-time loaders read the committed corpus. The original fragment links redirect to the corresponding route. Reading and navigation work without JavaScript; search, translation comparison, and theme selection enhance the page after hydration.

Only `build/client` is published, including React Router's navigation data. Unknown paths return the standalone HTTP 404 page. Canonical links and the generated sitemap use [stoicprayers.org](https://stoicprayers.org). Fingerprinted assets have immutable caching; HTML and route data use Cloudflare's default revalidation. All workers.dev origins receive `X-Robots-Tag: noindex`.

## Publication contract

| Event                                  | Validation                                                                                    | Publication                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| PR against main                        | Exact PR head; install, formatting, types, content and deployment tests, build, browser tests | Version upload with stable `pr-<number>` alias              |
| Push to main                           | Same checks on the pushed commit                                                              | Upload and check a candidate, then promote it to production |
| Failed, closed, or superseded revision | Verify current state through GitHub's API                                                     | Skip publication                                            |
| PR closed                              | Trusted workflow without checkout                                                             | Mark GitHub preview deployments inactive                    |

[CI](../.github/workflows/ci.yml) has read-only repository access and no deployment credentials. It uploads one immutable `site` artifact after all checks pass. The [publisher](../.github/workflows/deploy.yml) runs from trusted main on `workflow_run` completion. It validates the originating workflow, repository, event, result, and current branch or PR revision. The downloaded artifact must match its recorded SHA-256 digest.

Artifact extraction rejects traversal, symlinks, duplicate or noncanonical paths, hidden configuration, unexpected file types, and excessive size or file counts. Static artifacts are never executed. Pinned Wrangler and deployment scripts come from trusted main, with no restored PR caches or PR configuration. The `_headers` file must match trusted main. Fork PRs can receive previews after any GitHub-required contributor approval.

Publication is serialized by source repository and branch. Immediately before promotion, the publisher rechecks that the commit is still current. Both preview and production candidates use `wrangler versions upload`; live smoke tests check the immutable version before production promotion through the Workers deployments API. The same artifact bytes serve both origins.

GitHub Deployment records and Actions summaries expose the stable preview alias, exact version URL, commit, artifact digest, and Cloudflare version ID. A failed live check marks publication failed. Closing a PR retires its GitHub environment; its last public Cloudflare preview can remain accessible.

## Operations

The Worker is isolated in the Personal (AI) Cloudflare account. CI needs only Account / Workers Scripts / Edit, scoped to that account. Domain registration, DNS, and Custom Domain attachment are separate bootstrap operations. GitHub Actions is the sole automatic publisher.

See [deployment operations](deployment.md) for account configuration, setup, and rollback, and the [content audit](content-audit.md) for source provenance and editorial limits.

Platform references: [React Router pre-rendering](https://reactrouter.com/how-to/pre-rendering), [Cloudflare static routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/), [preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/), [asset headers](https://developers.cloudflare.com/workers/static-assets/headers/), and [GitHub workflow-run events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
