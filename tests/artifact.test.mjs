import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const makeZip = `import json, sys, zipfile, stat
with zipfile.ZipFile(sys.argv[1], 'w') as z:
    for name, kind in json.loads(sys.argv[2]):
        info = zipfile.ZipInfo(name)
        if kind == 'link': info.external_attr = (stat.S_IFLNK | 0o777) << 16
        z.writestr(info, 'static document')`;
async function extract(entries) {
  await mkdir(".scratch", { recursive: true });
  const dir = await mkdtemp(".scratch/artifact-");
  const archive = resolve(dir, "site.zip");
  const output = resolve(dir, "assets");
  const created = spawnSync("python3", [
    "-c",
    makeZip,
    archive,
    JSON.stringify(entries),
  ]);
  assert.equal(created.status, 0, created.stderr.toString());
  const result = spawnSync("python3", [
    "scripts/unpack-artifact.py",
    archive,
    output,
  ]);
  return { dir, output, result };
}
const required = [
  ["index.html", "file"],
  ["404.html", "file"],
];
test("extracts ordinary static files", async () => {
  const fixture = await extract([
    ...required,
    ["assets/app.js", "file"],
    ["_headers", "file"],
  ]);
  try {
    assert.equal(fixture.result.status, 0, fixture.result.stderr.toString());
    assert.equal(
      await readFile(`${fixture.output}/assets/app.js`, "utf8"),
      "static document",
    );
  } finally {
    await rm(fixture.dir, { recursive: true });
  }
});
for (const [label, entry] of [
  ["parent traversal", ["../escaped.html", "file"]],
  ["absolute path", ["/escaped.html", "file"]],
  ["hidden configuration", [".wrangler/config.json", "file"]],
  ["symbolic link", ["link.html", "link"]],
  ["duplicate member", ["index.html", "file"]],
  ["noncanonical path", ["assets//app.js", "file"]],
  ["executable configuration", ["wrangler.toml", "file"]],
]) {
  test(`rejects ${label}`, async () => {
    const fixture = await extract([...required, entry]);
    try {
      assert.notEqual(fixture.result.status, 0);
    } finally {
      await rm(fixture.dir, { recursive: true });
    }
  });
}
