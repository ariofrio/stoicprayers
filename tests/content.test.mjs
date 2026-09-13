import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const prayers = JSON.parse(
  readFileSync(new URL("../app/content/prayers.json", import.meta.url)),
);
test("each passage has a complete original, a precise citation, and safe source links", () => {
  assert.equal(prayers.length, 22);
  assert.equal(new Set(prayers.map((p) => p.id)).size, 22);
  for (const p of prayers) {
    assert.match(p.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(p.reference && p.original && p.literal);
    assert.ok(!p.original.includes("…"), p.id + " has an abbreviated original");
    assert.ok(p.sources.length > 0);
    for (const source of p.sources)
      assert.equal(new URL(source.url).protocol, "https:");
  }
});
test("Higginson retains his historical wording instead of a modern substitution", () => {
  const p = prayers.find(
    (p) => p.id === "epictetus-prayer-of-self-examination-in-illness-and-death",
  );
  assert.ok(
    p.editions.some((e) => e.text.includes("the senses, the instincts")),
  );
});
test("the lightweight catalogue stays synchronized with published routes", () => {
  const catalog = JSON.parse(
    readFileSync(new URL("../app/content/catalog.json", import.meta.url)),
  );
  assert.deepEqual(
    catalog,
    prayers.map(({ id, author, title, category, reference }) => ({
      id,
      author,
      title,
      category,
      reference,
    })),
  );
  assert.equal(
    prayers.reduce((count, p) => count + p.editions.length, 0),
    40,
  );
});
