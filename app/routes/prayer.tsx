import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "react-router";
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

function subscribeToNothing() {
  return () => {};
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
  const location = useLocation();
  const navigate = useNavigate();
  const menu = useRef<HTMLDetailsElement>(null);
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const enhanced = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const lastView = useRef(hash);
  if (hash !== "#sources") lastView.current = hash;
  const view = lastView.current.slice(1);
  const availableSections = [
    "original",
    "modern",
    "historical",
    ...(second !== null ? ["additional"] : []),
  ];
  const section = availableSections.includes(view) ? view : "historical";
  const compare = view === "compare" || section === "additional";
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
  function closeMenu() {
    if (!menu.current?.open) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  }
  function removeTranslation() {
    setSecond(null);
    if (section === "additional")
      navigate("#compare", {
        replace: true,
        state: location.state,
        preventScrollReset: true,
      });
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
              onClick={removeTranslation}
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
        <p className="source-reference">
          {prayer.reference}
          <span className="sources-link">
            <span aria-hidden="true"> · </span>
            <Link
              to="#sources"
              state={location.state}
              preventScrollReset
              aria-current={hash === "#sources" ? "location" : undefined}
            >
              Sources &amp; notes
            </Link>
          </span>
        </p>
      </section>
      <div className="reader-bar">
        <nav className="view-switch" aria-label="Reading view">
          {[
            ["historical", "Historical"],
            ["modern", "Literal"],
            ["original", "Original"],
            ["compare", "Compare"],
          ].map(([id, label]) => (
            <Link
              key={id}
              to={`#${id}`}
              state={location.state}
              preventScrollReset
              className={id === "compare" ? "js-only" : undefined}
              aria-current={
                enhanced && (compare ? id === "compare" : section === id)
                  ? "location"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <details
          ref={menu}
          className="reader-menu js-only"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeMenu();
          }}
          onToggle={(event) => {
            if (!event.currentTarget.open)
              setCopyMessage((message) =>
                message === "Link copied" ? "" : message,
              );
          }}
        >
          <summary aria-label="Page actions" title="Page actions">
            <span aria-hidden="true">⋯</span>
          </summary>
          <div className="reader-menu-items">
            <button onClick={copyLink}>
              {copyMessage === "Link copied" ? "Link copied" : "Copy link"}
            </button>
            <button
              onClick={() => {
                closeMenu();
                window.print();
              }}
            >
              Print
            </button>
          </div>
        </details>
        <span className="sr-only" role="status">
          {copyMessage}
        </span>
      </div>
      {copyMessage && copyMessage !== "Link copied" && (
        <p className="copy-status">{copyMessage}</p>
      )}
      {compare && (
        <div className="comparison-tools">
          <p className="comparison-note">
            Compare whole passages; lines are not aligned word for word. Texts
            stack on smaller screens.
          </p>
          {prayer.editions.length > 1 && second === null && (
            <button onClick={() => setSecond(edition === 0 ? 1 : 0)}>
              Add translation
            </button>
          )}
        </div>
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
