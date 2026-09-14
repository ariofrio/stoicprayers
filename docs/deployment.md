# Deployment operations

The application uses React Router 8.3.1, Node 22.23.2, and Cloudflare Workers Static Assets. Only `build/client` is deployed. There is no server runtime, database, or runtime secret.

## Ownership and configuration

- Repository: [ariofrio/stoicprayers](https://github.com/ariofrio/stoicprayers).
- Cloudflare account: Personal (AI), `daabd388c9779fd8ffa3ad1b29960394`.
- Worker: `stoicprayers`.
- Worker origin: [stoicprayers.ariofrio-ai.workers.dev](https://stoicprayers.ariofrio-ai.workers.dev).
- Production origin: [stoicprayers.org](https://stoicprayers.org).
- GitHub secret: `CLOUDFLARE_API_TOKEN`, scoped to Account / Workers Scripts / Edit in this account.
- GitHub variables: `CLOUDFLARE_ACCOUNT_ID` and `PRODUCTION_URL`.

Domain registration, DNS, and attaching the Custom Domain are bootstrap operations outside the CI token’s permissions. CI uploads versions and promotes them; it does not change domain routes. Set `PRODUCTION_URL` to the domain only after its DNS and certificate work. The workers.dev origin receives a noindex header.

## Domain

The domain is registered with Cloudflare in Personal (AI). Its [DNS zone](https://dash.cloudflare.com/daabd388c9779fd8ffa3ad1b29960394/stoicprayers.org/dns/records) is `958af105fefdf0021911bfec66d45902`, with nameservers `joel.ns.cloudflare.com` and `leia.ns.cloudflare.com`. The apex is a Worker Custom Domain; Cloudflare manages its DNS record and certificate. A proxied `www` CNAME and a Redirect Rule send `www` requests to the HTTPS apex with HTTP 301, preserving the path and query string.

Registrant contact privacy is enabled. Registration expires on September 14, 2027 (UTC), and automatic renewal is disabled. Renew through [Cloudflare Registrar](https://dash.cloudflare.com/daabd388c9779fd8ffa3ad1b29960394/domains/registrations) before expiry. Registrar automation requires a user-owned token with Account / Registrar: Domains / Admin; keep this credential separate from CI's deployment token.

## Workflow

[CI](../.github/workflows/ci.yml) checks PR head commits and pushes to `main`, without deployment credentials. Its single `site` artifact is retained for 14 days. PR-head validation makes the preview revision explicit; pushes to `main` are checked again after merging.

[Publish](../.github/workflows/deploy.yml) runs trusted code from `main` after CI succeeds. It verifies the originating workflow, event, repository, and current commit through GitHub’s API, checks the artifact digest, and safely extracts only static files. It never executes PR code, PR deployment configuration, or a PR dependency installation with secrets. The artifact’s `_headers` must match the trusted publication policy. Header-policy changes require updating trusted `main` before preview publication.

The publisher uses `wrangler versions upload` for both destinations, checks the exact version URL, and promotes that same version for a current `main` push through Cloudflare’s deployments API. This refinement of the original architecture minimizes token permissions and tests a production candidate before routing traffic to it. A post-promotion smoke test verifies the configured production origin. Failure marks the GitHub deployment failed; rollback remains explicit.

Preview aliases have the form `pr-42-stoicprayers.ariofrio-ai.workers.dev`. The GitHub Deployment and Actions summary contain both the stable alias and exact version URL. Publishing is serialized by source repository and branch, and stale runs are skipped. Closing a PR marks its deployment records inactive; Cloudflare may continue serving its last public preview. These URLs are not permanent archives.

## First deployment

1. Provision the Worker with `npx wrangler deploy` using an authorized local login. The account’s workers.dev subdomain must exist and preview URLs must be enabled.
2. Configure the repository secret and variables above. Keep Cloudflare Builds disconnected; GitHub Actions is the publisher.
3. Push a passing commit to `main` and verify both CI and Publish.
4. Open a PR, update it, and confirm its alias changes to the new version while the prior version-specific URL stays addressable.
5. Verify apex DNS/HTTPS and the www redirect. Set `PRODUCTION_URL` to `https://stoicprayers.org`.

## Rollback

Record the last successful version ID from the [Publish runs](https://github.com/ariofrio/stoicprayers/actions/workflows/deploy.yml) or `npx wrangler deployments list` before changing production.

```sh
npx wrangler rollback VERSION_ID
node scripts/smoke.mjs https://stoicprayers.org
```

Revert the corresponding code change on `main`, or commit a fix, so the next deployment preserves the correction. Version rollback affects code/assets; domain configuration is managed separately.
