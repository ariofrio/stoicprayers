import { readFile, writeFile, mkdir, appendFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { validateTarget } from "./deployment-policy.mjs";
import { smoke } from "./smoke.mjs";

const repo = "ariofrio/stoicprayers";
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const runId = event.workflow_run?.id;
if (!Number.isSafeInteger(runId)) throw new Error("Missing workflow run");
async function github(path, body) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
  return response.json();
}
async function currentTarget() {
  const run = await github(`actions/runs/${runId}`);
  const main = await github("git/ref/heads/main");
  const pulls =
    run.event === "pull_request"
      ? await github(`commits/${run.head_sha}/pulls?per_page=100`)
      : [];
  return { run, target: validateTarget(run, main.object.sha, pulls) };
}
const { run, target } = await currentTarget();
if (!target) {
  console.log("Run is no longer eligible for publication.");
  process.exit(0);
}
await mkdir(".publish", { recursive: true });
const artifacts = await github(`actions/runs/${runId}/artifacts?per_page=100`);
if (artifacts.total_count > 100)
  throw new Error("Unexpected artifact population");
const matches = artifacts.artifacts.filter(
  (a) => a.name === "site" && !a.expired,
);
if (matches.length !== 1) throw new Error("Expected one static artifact");
const artifact = matches[0];
if (artifact.size_in_bytes > 50_000_000) throw new Error("Artifact too large");
const response = await fetch(
  `https://api.github.com/repos/${repo}/actions/artifacts/${artifact.id}/zip`,
  { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}` } },
);
if (!response.ok)
  throw new Error(`Artifact download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
if (!artifact.digest || digest !== artifact.digest)
  throw new Error("Artifact digest mismatch");
await writeFile(".publish/site.zip", bytes);
execFileSync(
  "python3",
  ["scripts/unpack-artifact.py", ".publish/site.zip", ".publish/assets"],
  { stdio: "inherit" },
);
const expectedHeaders = await readFile("public/_headers", "utf8");
if ((await readFile(".publish/assets/_headers", "utf8")) !== expectedHeaders)
  throw new Error("Asset headers differ from trusted publishing policy");
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
config.assets.directory = resolve(".publish/assets");
delete config.$schema;
await writeFile(".publish/wrangler.json", JSON.stringify(config));
const deployment = await github("deployments", {
  ref: run.head_sha,
  environment: target.environment,
  auto_merge: false,
  required_contexts: [],
  transient_environment: !target.production,
  production_environment: target.production,
  description: "Static artifact validated by CI",
  payload: { run_id: runId, artifact_id: artifact.id, digest },
});
const output = resolve(".publish/wrangler-output.jsonl");
await rm(output, { force: true });
let url;
try {
  execFileSync(
    "node_modules/.bin/wrangler",
    [
      "versions",
      "upload",
      "--config",
      ".publish/wrangler.json",
      "--preview-alias",
      target.alias,
      "--tag",
      run.head_sha,
      "--message",
      `CI run ${runId}`,
    ],
    {
      stdio: "inherit",
      env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: output },
    },
  );
  const records = (await readFile(output, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const uploaded = records.findLast((r) => r.type === "version-upload");
  if (!uploaded?.version_id || !uploaded.preview_url)
    throw new Error("Missing version deployment output");
  for (const candidate of [
    uploaded.preview_url,
    uploaded.preview_alias_url,
  ].filter(Boolean)) {
    const host = new URL(candidate);
    if (
      host.protocol !== "https:" ||
      !host.hostname.endsWith(".ariofrio-ai.workers.dev")
    )
      throw new Error("Unexpected preview origin");
  }
  await smoke(uploaded.preview_url, true);
  const latest = await currentTarget();
  if (!latest.target || latest.target.environment !== target.environment) {
    await github(`deployments/${deployment.id}/statuses`, {
      state: "inactive",
      description: "Superseded while uploading",
    });
    process.exit(0);
  }
  url = uploaded.preview_alias_url || uploaded.preview_url;
  if (target.production) {
    const api = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/stoicprayers/deployments`;
    const promoted = await fetch(api, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        strategy: "percentage",
        versions: [{ version_id: uploaded.version_id, percentage: 100 }],
        annotations: { "workers/message": `GitHub ${run.head_sha}` },
      }),
    });
    if (!promoted.ok || !(await promoted.json()).success)
      throw new Error(`Production promotion failed: ${promoted.status}`);
    url = process.env.PRODUCTION_URL || "https://stoicprayers.org";
    await smoke(url, new URL(url).hostname.endsWith(".workers.dev"));
  } else {
    await smoke(url, true);
  }
  await github(`deployments/${deployment.id}/statuses`, {
    state: "success",
    environment_url: url,
    log_url: `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    description: `Cloudflare version ${uploaded.version_id}`,
  });
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `Deployed [${target.environment}](${url})\n\n[Exact version](${uploaded.preview_url}) · Commit \`${run.head_sha}\` · Version \`${uploaded.version_id}\`\n\nArtifact \`${digest}\`\n`,
  );
} catch (error) {
  await github(`deployments/${deployment.id}/statuses`, {
    state: "failure",
    description: String(error.message).slice(0, 140),
    ...(url ? { environment_url: url } : {}),
  });
  throw error;
}
