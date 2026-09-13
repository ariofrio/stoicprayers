export function validateTarget(run, currentMain, pulls) {
  const repository = "ariofrio/stoicprayers";
  if (
    run.repository?.full_name !== repository ||
    run.path !== ".github/workflows/ci.yml" ||
    run.conclusion !== "success"
  )
    return null;
  if (run.event === "push") {
    if (
      run.head_branch !== "main" ||
      run.head_repository?.full_name !== repository ||
      run.head_sha !== currentMain
    )
      return null;
    return { environment: "production", production: true, alias: "release" };
  }
  if (run.event !== "pull_request") return null;
  const pr = pulls.find(
    (pr) =>
      pr.state === "open" &&
      pr.head.sha === run.head_sha &&
      pr.head.repo?.full_name === run.head_repository?.full_name &&
      pr.base.repo.full_name === repository &&
      pr.base.ref === "main",
  );
  return pr
    ? {
        environment: `preview-pr-${pr.number}`,
        production: false,
        alias: `pr-${pr.number}`,
        pr: pr.number,
      }
    : null;
}
