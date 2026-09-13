import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/prayer";
import { catalog, type Prayer } from "../content/catalog";
import { getPrayer } from "../content/prayers.server";

export function loader({ params }: Route.LoaderArgs) {
  const prayer = getPrayer(params.id);
  if (!prayer) throw new Response("Not found", { status: 404 });
  return { prayer };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Passage not found — Stoic prayers" }];
  const { prayer } = loaderData;
  return [
    { title: `${prayer.title} — ${prayer.author} — Stoic prayers` },
    {
      name: "description",
      content: `${prayer.author}, ${prayer.reference}. Read the original text, a literal rendering, and historical English translations.`,
    },
    {
      tagName: "link",
      rel: "canonical",
      href: `https://stoicprayers.org/prayers/${prayer.id}`,
    },
  ];
}

export default function PrayerRoute({ loaderData }: Route.ComponentProps) {
  return <Reader key={loaderData.prayer.id} prayer={loaderData.prayer} />;
}

function Reader({ prayer }: { prayer: Prayer }) {
  const [edition, setEdition] = useState(0);
  const [second, setSecond] = useState<number | null>(null);
  const [stacked, setStacked] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const index = catalog.findIndex((p) => p.id === prayer.id);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `https://stoicprayers.org/prayers/${prayer.id}`,
      );
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Copy this page’s address from your browser.");
    }
  }
  function translationColumn(value: number, extra = false) {
    const e = prayer.editions[value];
    return (
      <section
        id={extra ? "additional" : "historical"}
        tabIndex={-1}
        className="text-column historical"
      >
        <header>
          <p className="eyebrow">Historical translation</p>
          <label
            className="sr-only"
            htmlFor={extra ? "second-edition" : "edition"}
          >
            {extra ? "Additional translation" : "Historical translation"}
          </label>
          <select
            id={extra ? "second-edition" : "edition"}
            value={value}
            onChange={(event) =>
              extra
                ? setSecond(Number(event.target.value))
                : setEdition(Number(event.target.value))
            }
          >
            {prayer.editions.map((e, i) => (
              <option key={`${e.name}-${e.year}`} value={i}>
                {e.name} · {e.year}
              </option>
            ))}
          </select>
          <p className="column-subtitle">
            {e.year} · <a href={e.url}>Source edition ↗</a>
            {extra && (
              <>
                {" "}
                ·{" "}
                <button className="text-button" onClick={() => setSecond(null)}>
                  Remove
                </button>
              </>
            )}
          </p>
        </header>
        <div className="passage-text">{e.text}</div>
        <p className="verification-note">{e.verification}</p>
      </section>
    );
  }
  return (
    <main id="main" className="reader-page">
      <div className="reader-breadcrumb">
        <Link to="/">← Collection</Link>
        <span>
          {index + 1} / {catalog.length}
        </span>
      </div>
      <section className="reader-intro">
        <p className="eyebrow">
          {prayer.category} <span aria-hidden="true">/</span> {prayer.author}
        </p>
        <h1>{prayer.title}</h1>
        <p className="source-reference">{prayer.reference}</p>
      </section>
      <div className="reader-tools">
        <div className="view-switch" role="group" aria-label="Reading layout">
          <button aria-pressed={!stacked} onClick={() => setStacked(false)}>
            Parallel
          </button>
          <button aria-pressed={stacked} onClick={() => setStacked(true)}>
            Continuous
          </button>
        </div>
        <div className="reader-actions">
          {prayer.editions.length > 1 && second === null && (
            <button onClick={() => setSecond(edition === 0 ? 1 : 0)}>
              Compare another
            </button>
          )}
          <button onClick={copyLink}>Copy link</button>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <p className="copy-status" role="status">
        {copyMessage}
      </p>
      <nav className="section-links" aria-label="Passage sections">
        <span>Jump to</span>
        <a href="#original">Original text</a>
        <a href="#modern">Modern rendering</a>
        <a href="#historical">Historical translation</a>
        {second !== null && <a href="#additional">Additional translation</a>}
        <a href="#sources">Sources &amp; notes</a>
      </nav>
      <div
        className={`reading-grid${stacked ? " continuous" : ""}${second !== null ? " four-columns" : ""}`}
      >
        <section id="original" tabIndex={-1} className="text-column original">
          <header>
            <p className="eyebrow">Original text</p>
            <h2>
              {prayer.originals.length > 1
                ? "Greek & Latin"
                : prayer.originals[0].label}
            </h2>
            <p className="column-subtitle">
              {prayer.originals.length > 1
                ? "Two ancient witnesses"
                : "The ancient words"}
            </p>
          </header>
          <div className="passage-text">
            {prayer.originals.map((o) => (
              <div key={o.label}>
                {prayer.originals.length > 1 && <h3>{o.label}</h3>}
                <p lang={o.language}>{o.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="modern" tabIndex={-1} className="text-column literal">
          <header>
            <p className="eyebrow">Modern rendering</p>
            <h2>Close to the words</h2>
            <p className="column-subtitle">Literal English · editorial draft</p>
          </header>
          <div className="passage-text">{prayer.literal}</div>
          <p className="verification-note">
            An editorial aid to reading, not a substitute for the original.{" "}
            <Link to="/about#literal">About this rendering</Link>
          </p>
        </section>
        {translationColumn(edition)}
        {second !== null && translationColumn(second, true)}
      </div>
      <section
        id="sources"
        tabIndex={-1}
        className="source-notes"
        aria-labelledby="notes-heading"
      >
        <div>
          <p className="eyebrow">Read with context</p>
          <h2 id="notes-heading">Sources & notes</h2>
        </div>
        <div>
          {prayer.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p>
            Historical editions may include surrounding context or use different
            phrasing. Parallel columns compare passages; their lines are not
            word-for-word alignments.
          </p>
          <ul>
            {prayer.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url}>{s.label} ↗</a>
              </li>
            ))}
          </ul>
          <p className="small-note">
            The source review is selective. Additional prototype transcriptions
            are preserved in the repository pending verification.{" "}
            <Link to="/about">Editorial method →</Link>
          </p>
        </div>
      </section>
      <nav className="reader-pagination" aria-label="Adjacent passages">
        {index > 0 ? (
          <Link to={`/prayers/${catalog[index - 1].id}`}>
            <small>← Previous</small>
            {catalog[index - 1].title}
          </Link>
        ) : (
          <Link to="/">
            <small>← Collection</small>All passages
          </Link>
        )}
        {index < catalog.length - 1 ? (
          <Link to={`/prayers/${catalog[index + 1].id}`}>
            <small>Next →</small>
            {catalog[index + 1].title}
          </Link>
        ) : (
          <Link to="/">
            <small>Return →</small>All passages
          </Link>
        )}
      </nav>
    </main>
  );
}
