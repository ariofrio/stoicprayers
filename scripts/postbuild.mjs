import { readFile, writeFile, rm } from "node:fs/promises";
const prayers = JSON.parse(await readFile("app/content/prayers.json", "utf8"));
const paths = ["/", "/about", ...prayers.map((p) => `/prayers/${p.id}`)];
await writeFile(
  "build/client/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>https://stoicprayers.org${path}</loc></url>`).join("")}</urlset>`,
);
await rm("build/client/__spa-fallback.html", { force: true });
