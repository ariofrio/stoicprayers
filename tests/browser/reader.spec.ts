import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("one reading control switches texts, compares editions, and keeps deep links", async ({
  page,
}) => {
  await page.goto("/prayers/cleanthes-hymn-to-zeus");
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#original")).toBeHidden();
  const view = page.getByRole("navigation", { name: "Reading view" });
  const option = (name: string) =>
    view.getByRole("link", { name, exact: true });
  await expect(option("Historical")).toHaveAttribute(
    "aria-current",
    "location",
  );
  await option("Original").click();
  await expect(page).toHaveURL(/#original$/);
  await expect(page.locator("#original")).toBeVisible();
  await expect(page.locator("#historical")).toBeHidden();
  await page.reload();
  await expect(page.locator("#original")).toBeVisible();
  await expect(option("Original")).toHaveAttribute("aria-current", "location");
  for (const [hash, name] of [
    ["modern", "Literal"],
    ["historical", "Historical"],
  ]) {
    await page.goto(`/prayers/cleanthes-hymn-to-zeus#${hash}`);
    await expect(page.locator(`#${hash}`)).toBeVisible();
    await expect(page.locator(`#${hash}`)).toBeFocused();
    await expect(option(name)).toHaveAttribute("aria-current", "location");
  }
  await page.goto("/prayers/cleanthes-hymn-to-zeus#sources");
  await expect(page.locator("#sources")).toBeInViewport();
  await option("Compare").click();
  await expect(page).toHaveURL(/#compare$/);
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#modern")).toBeVisible();
  await expect(page.locator("#original")).toBeVisible();
  await page.getByRole("button", { name: "Add translation" }).click();
  const first = page.getByLabel("Historical translation", { exact: true });
  const second = page.getByLabel("Additional translation", { exact: true });
  expect(await first.inputValue()).not.toBe(await second.inputValue());
  await expect(
    second.locator(`option[value="${await first.inputValue()}"]`),
  ).toHaveCount(0);
  await option("Literal").click();
  await expect(page.locator("#modern")).toBeVisible();
  await expect(page.locator("#additional")).toBeHidden();
  await option("Compare").click();
  await expect(page.locator("#additional")).toBeVisible();
  await page.getByRole("button", { name: "Remove translation" }).click();
  await expect(second).toHaveCount(0);
  await expect(page.locator("#historical")).toBeVisible();
  await expect(page.locator("#original")).toBeVisible();
});

test("copy link and print are in the page actions menu", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/prayers/cleanthes-hymn-to-zeus");
  const actions = page.locator("details.reader-menu");
  const toggle = actions.locator("summary");
  await expect(toggle).toHaveAccessibleName("Page actions");
  const copy = page.getByRole("button", { name: "Copy link", exact: true });
  await expect(copy).toBeHidden();
  await toggle.click();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await copy.click();
  await expect(page.getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://stoicprayers.org/prayers/cleanthes-hymn-to-zeus",
  );
  await page.keyboard.press("Escape");
  await expect(actions).not.toHaveAttribute("open");
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeHidden();
});

test("the passage begins in the first screen", async ({ page }) => {
  for (const id of [
    "cleanthes-prayer-to-zeus-and-destiny",
    "epictetus-prayer-of-self-examination-in-illness-and-death",
  ]) {
    await page.goto(`/prayers/${id}`);
    await expect(page.locator("html")).toHaveAttribute("data-enhanced", "true");
    const firstLineBottom = await page
      .locator("#historical .passage-text")
      .evaluate((text) => {
        const range = document.createRange();
        range.selectNodeContents(text);
        return range.getClientRects()[0].bottom;
      });
    expect(firstLineBottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
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
  const view = page.getByRole("navigation", { name: "Reading view" });
  await view.getByRole("link", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Add translation" }).click();
  await expect(page.getByLabel("Additional translation")).toBeVisible();
  await view.getByRole("link", { name: "Historical", exact: true }).click();
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

test("reading links reach translations and notes without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/prayers/cleanthes-hymn-to-zeus`);
  const view = page.getByRole("navigation", { name: "Reading view" });
  await expect(view.getByRole("link", { name: "Compare" })).toBeHidden();
  for (const [name, id] of [
    ["Literal", "modern"],
    ["Historical", "historical"],
    ["Sources & notes", "sources"],
    ["Original", "original"],
  ]) {
    await page
      .getByRole("main")
      .getByRole("link", { name, exact: true })
      .click();
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
    page.getByRole("navigation", { name: "Reading view" }),
  ).toBeHidden();
  await expect(page.locator(".reader-menu")).toBeHidden();
});
