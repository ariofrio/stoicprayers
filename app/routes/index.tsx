import { useEffect, useRef, useState } from "react";
import { Link, useNavigationType, useSearchParams } from "react-router";
import { catalog, categories } from "../content/catalog";

const authors = [...new Set(catalog.map((p) => p.author))];

export function meta() {
  return [
    { title: "Stoic prayers — Ancient texts and English translations" },
    {
      name: "description",
      content:
        "Read 22 ancient prayers, hymns, and reflections in Greek and Latin, alongside a literal rendering and historical English translations.",
    },
    { tagName: "link", rel: "canonical", href: "https://stoicprayers.org/" },
  ];
}

export default function Collection() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const navigationType = useNavigationType();
  const initialNavigation = useRef(true);
  useEffect(() => {
    // URL replacements must not overwrite keystrokes while navigation is pending.
    if (initialNavigation.current || navigationType !== "REPLACE") {
      setQuery(params.get("q") || "");
      setAuthor(params.get("author") || "");
      initialNavigation.current = false;
    }
  }, [params, navigationType]);
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matching = catalog.filter((p) => {
    const text =
      `${p.author} ${p.title} ${p.reference} ${p.category}`.toLocaleLowerCase();
    return (
      (!author || p.author === author) &&
      terms.every((term) => text.includes(term))
    );
  });
  function filter(key: "q" | "author", value: string) {
    const values = {
      q: key === "q" ? value : query,
      author: key === "author" ? value : author,
    };
    setQuery(values.q);
    setAuthor(values.author);
    const next = new URLSearchParams(params);
    for (const [name, text] of Object.entries(values)) {
      if (text) next.set(name, text);
      else next.delete(name);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  }
  function clearFilters() {
    setQuery("");
    setAuthor("");
    setParams({}, { replace: true, preventScrollReset: true });
  }
  return (
    <main id="main" className="collection-page">
      <section className="intro">
        <div>
          <h1>Prayers and reflections from the Stoic tradition</h1>
          <p className="intro-copy">
            A collection of {catalog.length} passages to read in English, with
            Greek and Latin originals and historical translations to explore.
          </p>
          <a className="browse-link" href="#collection-heading">
            Browse the collection
          </a>
        </div>
        <figure className="opening-quote">
          <blockquote>
            Lead me, Zeus,
            <br />
            and you too, Destiny.
          </blockquote>
          <p lang="grc">ἄγου δέ μ᾽, ὦ Ζεῦ, καὶ σύ γ᾽ ἡ Πεπρωμένη</p>
          <figcaption>
            Cleanthes, preserved in Enchiridion 53.1
            <span>Literal English rendering · editorial draft</span>
          </figcaption>
          <Link
            className="start-link"
            to="/prayers/cleanthes-prayer-to-zeus-and-destiny"
          >
            Read this passage <span aria-hidden="true">→</span>
          </Link>
        </figure>
      </section>
      <section className="collection" aria-labelledby="collection-heading">
        <div className="collection-heading">
          <h2 id="collection-heading" tabIndex={-1}>
            Explore the collection
          </h2>
          <div className="collection-filters js-only">
            <label className="search-label">
              <span>Find a passage</span>
              <input
                type="search"
                value={query}
                onChange={(e) => filter("q", e.target.value)}
                placeholder="Title, author, or source"
              />
            </label>
            <label className="author-label">
              <span>Author</span>
              <select
                value={author}
                onChange={(e) => filter("author", e.target.value)}
              >
                <option value="">All authors</option>
                {authors.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="results-summary">
          <p className="result-count" role="status">
            {matching.length} of {catalog.length} passages
          </p>
          {(query || author) && (
            <button className="text-button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
        {categories.map((category) => {
          const items = matching.filter((p) => p.category === category);
          return items.length ? (
            <section
              className="passage-group"
              key={category}
              aria-label={category}
            >
              <h3>{category}</h3>
              <div>
                {items.map((p) => (
                  <Link
                    className="passage-link"
                    key={p.id}
                    to={`/prayers/${p.id}`}
                    state={{ collectionSearch: params.toString() }}
                    data-prayer-id={p.id}
                  >
                    <span className="passage-author">{p.author}</span>
                    <span className="passage-title">
                      {p.title}
                      <small>{p.reference}</small>
                    </span>
                    <span className="passage-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null;
        })}
        {matching.length === 0 && (
          <div className="empty-state">
            <h3>No passages found</h3>
            <p>Try fewer words or choose a different author.</p>
          </div>
        )}
      </section>
      <aside className="editorial-note">
        <h2>About these texts</h2>
        <p>
          Each passage includes source links and notes. Historical translations
          are distinguished from our modern literal renderings, which are
          editorial drafts.
        </p>
        <Link to="/about">How the texts were prepared</Link>
      </aside>
    </main>
  );
}
