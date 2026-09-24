import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router";
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

function subscribeToHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

function Reader({ prayer }: { prayer: Prayer }) {
  const [edition, setEdition] = useState(() =>
    prayer.editions.reduce(
      (latest, item, i, editions) =>
        Number(item.year) > Number(editions[latest].year) ? i : latest,
      0,
    ),
  );
  const [second, setSecond] = useState<number | null>(null);
  const [compare, setCompare] = useState(false);
  const location = useLocation();
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const availableSections = [
    "original",
    "modern",
    "historical",
    ...(second !== null ? ["additional"] : []),
  ];
  const section = availableSections.includes(hash.slice(1))
    ? hash.slice(1)
    : "historical";
  useEffect(() => {
    if (hash === `#${section}` || hash === "#sources") {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView();
      target?.focus({ preventScroll: true });
    }
  }, [hash, section]);
  const collectionSearch =
    typeof location.state?.collectionSearch === "string"
      ? location.state.collectionSearch
      : "";
  const collectionUrl = collectionSearch ? `/?${collectionSearch}` : "/";
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
        className={`text-column historical${extra ? " additional" : ""}`}
        data-active={section === (extra ? "additional" : "historical")}
      >
        <header>
          <h2>{extra ? "Additional translation" : "Historical translation"}</h2>
          {prayer.editions.length > 1 ? (
            <label className="js-only">
              <span className="sr-only">
                {extra ? "Additional translation" : "Historical translation"}
              </span>
              <select
                aria-label={
                  extra ? "Additional translation" : "Historical translation"
                }
                value={value}
                onChange={(event) =>
                  extra
                    ? setSecond(Number(event.target.value))
                    : setEdition(Number(event.target.value))
                }
              >
                {prayer.editions.map((option, i) =>
                  i === (extra ? edition : second) ? null : (
                    <option key={i} value={i}>
                      {option.name.split(" — ")[0]} · {option.year}
                    </option>
                  ),
                )}
              </select>
            </label>
          ) : (
            <p className="translator-name">
              {e.name}, {e.year}
            </p>
          )}
          {prayer.editions.length > 1 && (
            <p className="translator-name no-js-only">
              {e.name}, {e.year}
            </p>
          )}
          <p className="column-subtitle">
            {e.name.includes(" — ") && (
              <span className="edition-context">
                {e.name.split(" — ").slice(1).join(" — ")}
              </span>
            )}
            <a href={e.url}>Source edition</a>
          </p>
          {extra && (
            <button
              className="text-button remove-translation"
              onClick={() => setSecond(null)}
            >
              Remove translation
            </button>
          )}
        </header>
        <div className="passage-text">{e.text}</div>
        <p className="verification-note">{e.verification}</p>
      </section>
    );
  }
  return (
    <main id="main" className="reader-page">
      <div className="reader-breadcrumb">
        <Link to={collectionUrl}>← Collection</Link>
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
      <div className="reader-tools js-only">
        <div className="view-switch" role="group" aria-label="Reading view">
          <button aria-pressed={!compare} onClick={() => setCompare(false)}>
            Read
          </button>
          <button aria-pressed={compare} onClick={() => setCompare(true)}>
            Compare texts
          </button>
        </div>
        <div className="reader-actions">
          {compare && prayer.editions.length > 1 && second === null && (
            <button onClick={() => setSecond(edition === 0 ? 1 : 0)}>
              Add translation
            </button>
          )}
          <button onClick={copyLink}>
            {copyMessage === "Link copied" ? "Link copied" : "Copy link"}
          </button>
          <button onClick={() => window.print()}>Print</button>
        </div>
        <span className="sr-only" role="status">
          {copyMessage}
        </span>
      </div>
      {copyMessage && copyMessage !== "Link copied" && (
        <p className="copy-status">{copyMessage}</p>
      )}
      <nav className="section-links" aria-label="Passage sections">
        {[
          ["historical", "Historical translation"],
          ["modern", "Literal draft"],
          ["original", "Original text"],
          ...(second !== null
            ? [["additional", "Additional translation"]]
            : []),
        ].map(([id, label]) => (
          <Link
            key={id}
            to={`#${id}`}
            state={location.state}
            preventScrollReset
            aria-current={
              hash !== "#sources" && section === id ? "location" : undefined
            }
          >
            {label}
          </Link>
        ))}
        <Link
          to="#sources"
          state={location.state}
          preventScrollReset
          aria-current={hash === "#sources" ? "location" : undefined}
        >
          Sources &amp; notes
        </Link>
      </nav>
      {compare && (
        <p className="comparison-note">
          Compare whole passages; lines are not aligned word for word. Texts
          stack on smaller screens.
        </p>
      )}
      <div
        className={`reading-grid${compare ? " compare-view" : " read-view"}${second !== null ? " four-columns" : ""}`}
      >
        {!compare && translationColumn(edition)}
        <section
          id="original"
          tabIndex={-1}
          className="text-column original"
          data-active={section === "original"}
        >
          <header>
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
        <section
          id="modern"
          tabIndex={-1}
          className="text-column literal"
          data-active={section === "modern"}
        >
          <header>
            <h2>Literal English</h2>
            <p className="column-subtitle">
              Editorial draft · developed with AI assistance
            </p>
          </header>
          <div className="passage-text">{prayer.literal}</div>
          <p className="verification-note">
            An aid to reading that has not received independent specialist
            review. <Link to="/about#literal">About this rendering</Link>
          </p>
        </section>
        {compare && translationColumn(edition)}
        {second !== null && translationColumn(second, true)}
      </div>
      <section
        id="sources"
        tabIndex={-1}
        className="source-notes"
        aria-labelledby="notes-heading"
      >
        <div>
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
            <Link to="/about">Editorial method</Link>
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
