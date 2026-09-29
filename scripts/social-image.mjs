// Renders public/social.png, the link preview image: node scripts/social-image.mjs
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const mark = await readFile("public/favicon.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<body style="margin:0;width:1200px;height:630px;box-sizing:border-box;padding:88px 96px;background:#f8faf9;color:#172c36;font-family:Georgia,serif;border-bottom:18px solid #245b60">
  <div style="width:120px;height:120px">${mark}</div>
  <h1 style="margin:48px 0 0;font-size:104px;font-weight:400;line-height:1">Stoic prayers</h1>
  <p style="margin:28px 0 0;font-size:44px;line-height:1.3;color:#53676b">Ancient prayers, hymns, and reflections<br>in Greek, Latin, and English</p>
</body>`);
await page.screenshot({ path: "public/social.png" });
await browser.close();
