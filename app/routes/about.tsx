import { Link } from "react-router";

export function meta() {
  return [
    { title: "About the texts — Stoic prayers" },
    {
      name: "description",
      content:
        "Scope, source verification, and translation method for the Stoic prayers collection.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://stoicprayers.org/about",
    },
  ];
}

export default function About() {
  return (
    <main id="main" className="prose-page">
      <Link to="/">← Collection</Link>
      <p className="eyebrow">Editorial method</p>
      <h1>Words with a history.</h1>
      <p className="lead">
        A small collection for careful reading, with a clear distinction between
        what the sources say and how we render them.
      </p>
      <h2>What belongs here</h2>
      <p>
        The collection contains 22 selections: direct prayers and hymns,
        philosophical reflections on prayer, and related voices quoted or valued
        within the Stoic tradition. It is not a complete census of surviving
        Stoic prayers. Titles and groupings are editorial.
      </p>
      <p>
        Cleanthes, Epictetus, Marcus Aurelius, and Seneca form its core.
        Demetrius is a Cynic; Socrates and Euripides predate the Stoic school.
        Aratus and Persius are poets. Their relationship to the collection is
        explained alongside their passages.
      </p>
      <h2>Originals and historical translations</h2>
      <p>
        Greek and Latin passages have source references. Abbreviated originals
        in the prototype have been restored where the accompanying translation
        covered the complete passage. Greek editorial deletions are respected;
        typography and spacing are normalized.
      </p>
      <p>
        The reader contains 40 historical translation selections. Their wording
        was compared with linked digital transcriptions. This establishes a
        textual match, not a fresh collation of every printed edition. Obvious
        transcription corrections are disclosed. The dates identify the cited
        editions or their historical publication dates, not the date the website
        was created.
      </p>
      <p>
        The prototype supplied 165 historical selections. Source links for 125
        candidates did not establish the text and attribution sufficiently for
        this release. They remain in the{" "}
        <a href="https://github.com/ariofrio/stoicprayers/blob/main/docs/withheld-transcriptions.json">
          review file
        </a>
        , rather than being presented as verified quotations. Missing
        verification does not itself mean a translation is wrong.
      </p>
      <h2 id="literal">The literal English rendering</h2>
      <p>
        The modern rendering is an editorial draft, developed with AI assistance
        and checked against the displayed ancient text. It aims to preserve
        meaning, repetition, and philosophical vocabulary rather than meter. It
        has not received an independent specialist review. A disputed ancient
        reading can also produce a disputed translation; notes flag material
        examples.
      </p>
      <h2>Reading across editions</h2>
      <p>
        Use “Jump to” above each passage to reach the original, modern
        rendering, historical translation, or source notes directly. These links
        also work without JavaScript and make long passages easier to read on a
        phone.
      </p>
      <p>
        Choose a historical translator from the selector above the English
        column. “Compare another” adds a second edition. “Continuous” stacks the
        texts for a longer reading session. Translations may include context
        outside the selected ancient words; parallel presentation does not imply
        exact line alignment.
      </p>
      <h2>Sources and corrections</h2>
      <p>
        The texts link to Perseus, digitized historical books, and public
        transcriptions. The historical editions displayed here were published
        before 1931; copyright status depends on jurisdiction. Digital editorial
        material can have separate terms. See the{" "}
        <a href="https://github.com/ariofrio/stoicprayers/blob/main/docs/content-audit.md">
          source audit
        </a>{" "}
        for corrections and evidence.
      </p>
      <p>
        If you find a problem,{" "}
        <a href="https://github.com/ariofrio/stoicprayers/issues/new">
          report a correction
        </a>{" "}
        with the passage, edition, and page or stable source link. The
        repository preserves the original prototype and the revision history.
      </p>
    </main>
  );
}
