import test from "node:test";
import assert from "node:assert/strict";
import { validateTarget } from "../scripts/deployment-policy.mjs";
const repo = "ariofrio/stoicprayers";
const base = {
  repository: { full_name: repo },
  path: ".github/workflows/ci.yml",
  conclusion: "success",
  head_sha: "abc",
  head_repository: { full_name: repo },
};
test("only the current successful main push can publish production", () => {
  assert.equal(
    validateTarget({ ...base, event: "push", head_branch: "main" }, "abc", [])
      .environment,
    "production",
  );
  assert.equal(
    validateTarget(
      { ...base, event: "push", head_branch: "main" },
      "newer",
      [],
    ),
    null,
  );
  assert.equal(
    validateTarget(
      { ...base, event: "pull_request_target", head_branch: "main" },
      "abc",
      [],
    ),
    null,
  );
  assert.equal(
    validateTarget(
      { ...base, event: "push", head_branch: "feature" },
      "abc",
      [],
    ),
    null,
  );
});
test("previews are tied to an open PR at the exact checked head, including forks", () => {
  const run = {
    ...base,
    event: "pull_request",
    head_repository: { full_name: "contributor/fork" },
  };
  const pr = {
    number: 42,
    state: "open",
    head: { sha: "abc", repo: { full_name: "contributor/fork" } },
    base: { ref: "main", repo: { full_name: repo } },
  };
  assert.equal(validateTarget(run, "main", [pr]).alias, "pr-42");
  assert.equal(validateTarget(run, "main", [{ ...pr, state: "closed" }]), null);
  assert.equal(
    validateTarget(run, "main", [
      { ...pr, head: { ...pr.head, sha: "newer" } },
    ]),
    null,
  );
  assert.equal(
    validateTarget({ ...run, conclusion: "failure" }, "main", [pr]),
    null,
  );
});
