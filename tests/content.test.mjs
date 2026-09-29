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
    assert.ok(p.themes.length > 0, p.id + " has no search themes");
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
    prayers.map(({ id, author, title, category, reference, themes }) => ({
      id,
      author,
      title,
      category,
      reference,
      themes,
    })),
  );
  assert.equal(
    prayers.reduce((count, p) => count + p.editions.length, 0),
    40,
  );
});
test("translation sources name an edition the reader displays", () => {
  for (const p of prayers)
    for (const source of p.sources) {
      const translator = source.label.match(/(\S+)’s (?:edition|translation)/);
      if (!translator) continue;
      assert.ok(
        p.editions.some(
          (e) => e.name.includes(translator[1]) && e.url === source.url,
        ),
        `${p.id}: “${source.label}” does not link a displayed edition`,
      );
    }
});
test("published edition text contains no OCR artifacts", () => {
  const artifacts = [
    [/\|/u, "a line-separator bar"],
    [/\p{L}\d|\d\p{L}/u, "a digit inside a word"],
    [/(?:^|[^\s\d]\s+)\d\s+\p{Ll}/mu, "a digit standing in for a letter"],
    [/[ſﬀ-ﬆ]/u, "an unnormalized long s or ligature"],
    [/[•◊�]/u, "an illegible-character marker"],
    [/\b(?:andfor|andthe|ofthe|tothe|inthe)\b/iu, "run-together words"],
  ];
  for (const p of prayers)
    for (const e of p.editions)
      for (const [pattern, description] of artifacts) {
        const match = e.text.match(pattern);
        assert.equal(
          match,
          null,
          `${p.id} (${e.name}) has ${description}: ${JSON.stringify(match?.[0])}`,
        );
      }
});
