import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("English opens first and readers can switch texts or compare distinct editions", async ({
  page,
}) => {
  await page.goto("/prayers/cleanthes-hymn-to-zeus");
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#original")).toBeHidden();
  const sections = page.getByRole("navigation", { name: "Passage sections" });
  await sections
    .getByRole("link", { name: "Original text", exact: true })
    .click();
  await expect(page.locator("#original")).toBeVisible();
  await expect(page.locator("#historical")).toBeHidden();
  await page.reload();
  await expect(page.locator("#original")).toBeVisible();
  await page
    .getByRole("button", { name: "Compare texts", exact: true })
    .click();
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#modern")).toBeVisible();
  await page.getByRole("button", { name: "Add translation" }).click();
  const first = page.getByLabel("Historical translation", { exact: true });
  const second = page.getByLabel("Additional translation", { exact: true });
  expect(await first.inputValue()).not.toBe(await second.inputValue());
  await expect(
    second.locator(`option[value="${await first.inputValue()}"]`),
  ).toHaveCount(0);
  await sections
    .getByRole("link", { name: "Additional translation", exact: true })
    .click();
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.locator("#additional")).toBeVisible();
  await page.getByRole("button", { name: "Remove translation" }).click();
  await expect(second).toHaveCount(0);
  await expect(page.locator("#historical")).toBeVisible();
});

test("collection search survives a passage visit and supports separate search terms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Find a passage" });
  await search.pressSequentially("Marcus universe");
  await expect(search).toHaveValue("Marcus universe");
  await expect(page.locator(".passage-link")).toHaveCount(1);
  await search.fill("Zeus Cleanthes");
  await expect(page.locator(".passage-link")).toHaveCount(2);
  await page.locator(".passage-link").first().click();
  await expect(page).toHaveURL(/\/prayers\/cleanthes-hymn-to-zeus$/);
  await page.goBack();
  await expect(search).toHaveValue("Zeus Cleanthes");
  await page.reload();
  await expect(search).toHaveValue("Zeus Cleanthes");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".passage-link")).toHaveCount(22);
  await page
    .getByRole("combobox", { name: "Author", exact: true })
    .selectOption("Seneca");
  await expect(page.locator(".passage-link")).toHaveCount(4);
  await page.locator(".passage-link").first().click();
  await expect(page).toHaveURL(/\/prayers\/seneca-/);
  await page.getByRole("link", { name: "← Collection", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Author", exact: true }),
  ).toHaveValue("Seneca");
  await search.fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "No passages found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".passage-link")).toHaveCount(22);
  await search.fill("Marcus");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Collection", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".passage-link")).toHaveCount(22);
  expect(errors).toEqual([]);
});
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
  await page
    .getByRole("button", { name: "Compare texts", exact: true })
    .click();
  await page.getByRole("button", { name: "Add translation" }).click();
  await expect(page.getByLabel("Additional translation")).toBeVisible();
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#original")).toBeHidden();
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

test("section links reach translations and notes without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/prayers/cleanthes-hymn-to-zeus`);
  const navigation = page.getByRole("navigation", { name: "Passage sections" });
  for (const [name, id] of [
    ["Literal draft", "modern"],
    ["Historical translation", "historical"],
    ["Sources & notes", "sources"],
    ["Original text", "original"],
  ]) {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await context.close();
});

test("print includes the original and draft even in the focused English view", async ({
  page,
}) => {
  await page.goto("/prayers/cleanthes-hymn-to-zeus");
  await expect(page.locator("#original")).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#original")).toBeVisible();
  await expect(page.locator("#modern")).toBeVisible();
  await expect(page.locator("#historical")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compare texts", exact: true }),
  ).toBeHidden();
});
