import { useState } from "react";
import { Link } from "react-router";
import { catalog, categories } from "../content/catalog";

export function meta() {
  return [
    { title: "Stoic prayers — A parallel text collection" },
    {
      name: "description",
      content:
        "Read 22 ancient prayers, hymns, and reflections in Greek and Latin, alongside a literal rendering and historical English translations.",
    },
    { tagName: "link", rel: "canonical", href: "https://stoicprayers.org/" },
  ];
}

export default function Collection() {
  const [query, setQuery] = useState("");
  const matching = catalog.filter((p) =>
    `${p.author} ${p.title} ${p.reference} ${p.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <main id="main" className="collection-page">
      <section className="intro">
        <div>
          <p className="eyebrow">Greek · Latin · English</p>
          <h1>
            Words for what
            <br />
            we cannot control.
          </h1>
          <p className="intro-copy">
            Prayers, hymns, and reflections from the Stoics and the voices they
            returned to. Read the ancient words beside their translations.
          </p>
          <Link className="start-link" to="/prayers/cleanthes-hymn-to-zeus">
            Begin with Cleanthes <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <figure className="opening-quote">
          <p lang="grc">
            ἄγου δέ μ᾽, ὦ Ζεῦ,
            <br />
            καὶ σύ γ᾽ ἡ Πεπρωμένη
          </p>
          <blockquote>
            Lead me, Zeus,
            <br />
            and you too, Destiny.
          </blockquote>
          <figcaption>
            Cleanthes ·{" "}
            <Link to="/prayers/cleanthes-prayer-to-zeus-and-destiny">
              Enchiridion 53.1 ↗
            </Link>
          </figcaption>
        </figure>
      </section>
      <section className="collection" aria-labelledby="collection-heading">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 id="collection-heading">A place to begin again</h2>
          </div>
          <label className="search-label">
            <span>Find a passage</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Author, title, or source…"
            />
          </label>
        </div>
        <p className="result-count" role="status">
          {matching.length} of {catalog.length} passages
        </p>
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
                    data-prayer-id={p.id}
                  >
                    <span className="passage-author">{p.author}</span>
                    <span className="passage-title">
                      {p.title}
                      <small>{p.reference}</small>
                    </span>
                    <span className="passage-arrow" aria-hidden="true">
                      ↗
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
            <p>Try an author such as Epictetus, or a word such as gratitude.</p>
            <button onClick={() => setQuery("")}>Clear search</button>
          </div>
        )}
      </section>
      <aside className="editorial-note">
        <span className="eyebrow">A note on this edition</span>
        <p>
          A curated collection, with source links and editorial notes. Ancient
          texts and historical translations are kept distinct from our literal
          renderings.
        </p>
        <Link to="/about">How the texts were prepared →</Link>
      </aside>
    </main>
  );
}
