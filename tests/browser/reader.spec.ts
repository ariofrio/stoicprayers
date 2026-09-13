import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const prayers = JSON.parse(
  readFileSync(
    new URL("../../app/content/prayers.json", import.meta.url),
    "utf8",
  ),
);

test("every passage is readable in its HTML before JavaScript runs", async ({
  request,
}) => {
  for (const prayer of prayers) {
    const response = await request.get(`/prayers/${prayer.id}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(
      prayer.title
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;"),
    );
    expect(html).toContain(prayer.originals[0].text.slice(0, 35));
    expect(html).toContain('rel="canonical"');
  }
});

test("reader navigation, comparison, and deep-link reload work without hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Find a passage" })
    .fill("Cleanthes");
  await expect(page.getByRole("status")).toHaveText("2 of 22 passages");
  await page
    .locator(".passage-link")
    .filter({ hasText: "Hymn to Zeus" })
    .click();
  await expect(page).toHaveURL(/\/prayers\/cleanthes-hymn-to-zeus$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hymn to Zeus",
  );
  await page
    .getByLabel("Historical translation", { exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Compare another" }).click();
  await expect(page.getByLabel("Additional translation")).toBeVisible();
  await page.getByRole("button", { name: "Continuous", exact: true }).click();
  await expect(page.locator(".reading-grid")).toHaveClass(/continuous/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hymn to Zeus",
  );
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("missing pages return real 404s and legacy fragment links migrate", async ({
  page,
  request,
}) => {
  const response = await request.get("/prayers/not-a-passage");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("Passage not found");
  await page.goto("/#epictetus-prayer-for-the-arrival-of-difficulties");
  await expect(page).toHaveURL(
    /\/prayers\/epictetus-prayer-for-the-arrival-of-difficulties$/,
  );
});

test("theme persists and remains usable without browser storage", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Use (dark|light) theme/ }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reading works with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/prayers/epictetus-prayer-of-complete-surrender`);
  await expect(
    page.getByRole("heading", {
      name: "Prayer of complete surrender",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/I agree with you; I am yours/)).toBeVisible();
  await page.getByRole("link", { name: "← Collection", exact: true }).click();
  await expect(page.locator(".passage-link")).toHaveCount(22);
  await context.close();
});
