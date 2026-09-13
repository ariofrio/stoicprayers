import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
export async function smoke(origin, preview = false) {
  const base = new URL(origin);
  assert.equal(base.protocol, "https:");
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const home = await fetch(new URL("/", base));
      assert.equal(home.status, 200);
      assert.match(home.headers.get("cache-control") || "", /max-age=0/);
      const html = await home.text();
      assert.match(html, /Words for what/);
      if (preview)
        assert.match(home.headers.get("x-robots-tag") || "", /noindex/);
      else assert.ok(!/noindex/.test(home.headers.get("x-robots-tag") || ""));
      const path = "/prayers/epictetus-prayer-of-complete-surrender";
      const prayer = await fetch(new URL(path, base));
      assert.equal(prayer.status, 200);
      assert.match(await prayer.text(), /I agree with you; I am yours/);
      const data = await fetch(new URL(`${path}.data`, base));
      assert.equal(data.status, 200);
      assert.ok(
        !(data.headers.get("content-type") || "").includes("text/html"),
      );
      const missing = await fetch(new URL("/prayers/not-a-passage", base));
      assert.equal(missing.status, 404);
      const asset = html.match(/(?:src|href)="(\/assets\/[^\"]+\.js)"/);
      assert.ok(asset);
      const script = await fetch(new URL(asset[1], base));
      assert.equal(script.status, 200);
      assert.equal(
        script.headers.get("cache-control"),
        "public, max-age=31536000, immutable",
      );
      console.log(`Smoke checks passed: ${base.origin}`);
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await smoke(process.argv[2], process.argv.includes("--preview"));
