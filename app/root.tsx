import { useEffect, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useLocation,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import "./style.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f6f1e7" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{let t=localStorage.getItem('stoic-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const id = location.hash.slice(1);
      if (document.querySelector(`a[data-prayer-id="${CSS.escape(id)}"]`))
        window.location.replace(`/prayers/${id}`);
    }
  }, [location]);
  function toggleTheme() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    setDark(!dark);
    try {
      localStorage.setItem("stoic-theme", theme);
    } catch {
      /* Reading also works without browser storage. */
    }
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Stoic prayers home">
          <span className="seal" aria-hidden="true">
            Σ
          </span>
          <span>
            Stoic prayers<small>A parallel text collection</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/">Collection</Link>
          <Link to="/about">About the texts</Link>
          <button
            className="theme-button"
            onClick={toggleTheme}
            aria-label={dark ? "Use light theme" : "Use dark theme"}
          >
            {dark ? "Light" : "Dark"}
            <span aria-hidden="true"> ◐</span>
          </button>
        </nav>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span>Read closely. Return often.</span>
        <div>
          <Link to="/about">Editorial method</Link>
          <a href="https://github.com/ariofrio/stoicprayers">
            Source & corrections ↗
          </a>
        </div>
      </footer>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" className="prose-page">
      <p className="eyebrow">Stoic prayers</p>
      <h1>
        {notFound ? "Passage not found" : "This page could not be opened"}
      </h1>
      <p>
        {notFound
          ? "This address is not in the collection."
          : "Reload the page, or return to the collection to keep reading."}
      </p>
      <Link to="/">Return to the collection →</Link>
    </main>
  );
}
