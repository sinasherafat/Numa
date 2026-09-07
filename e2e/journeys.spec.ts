import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("numa-demo-v1"));
});

test("J01 and J06 create a goal-shaped presentation session", async ({ page }) => {
  await page.goto("/new");
  await expect(page.getByRole("heading", { name: "What would you like to understand?" })).toBeVisible();
  await page.getByRole("button", { name: /Prepare a presentation/ }).click();
  await page.getByRole("button", { name: "20 min" }).click();
  await page.getByRole("button", { name: /Review plan/ }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { name: "Your learning path is ready to review." })).toBeVisible();
  await page.getByRole("link", { name: /Open sample audio/ }).click();
  await expect(page.getByRole("heading", { name: "Spaced practice & recall" })).toBeVisible();
});

test("J02 answers at the cursor and adapts only future chapters", async ({ page }) => {
  await page.goto("/listen");
  await page.getByRole("button", { name: "Explain this" }).click();
  await expect(page.getByText("Performance is what you can do now.")).toBeVisible();
  await page.getByRole("button", { name: "Update next chapters" }).click();
  await expect(page.getByText("Updated path")).toBeVisible();
  await expect(page.getByText("A clearer performance vs. learning example")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why the interval matters" })).toBeVisible();
});

test("J03 accepts an edited text explanation and keeps memory consent explicit", async ({ page }) => {
  await page.goto("/explain");
  const explanation = page.getByLabel("Editable transcript");
  await explanation.fill("Spacing can support later recall, while task and test timing limit the claim.");
  await page.getByRole("button", { name: /Submit explanation/ }).click();
  await expect(page).toHaveURL(/\/explain\/feedback$/);
  await expect(page.getByText("Memory OFF")).toBeVisible();
  await page.getByRole("switch", { name: "Learning memory" }).click();
  await expect(page.getByText("Memory ON")).toBeVisible();
});

test("J04 comparison preserves agreement, different conditions and unknowns", async ({ page }) => {
  await page.goto("/compare");
  await expect(page.getByRole("heading", { name: "Where do the sources agree?" })).toBeVisible();
  await expect(page.getByText("Agreement", { exact: true })).toBeVisible();
  await expect(page.getByText("Different conditions", { exact: true })).toBeVisible();
  await expect(page.getByText("Still unknown", { exact: true })).toBeVisible();
});

test("J05 changes keep the baseline until explicit review", async ({ page }) => {
  await page.goto("/topics/spaced-practice/changes");
  await expect(page.getByText("September 2 review")).toBeVisible();
  await page.getByRole("button", { name: "Mark update reviewed" }).click();
  await expect(page.getByText("September 6 review")).toBeVisible();
  await page.getByRole("button", { name: "Keep previous baseline" }).click();
  await expect(page.getByText("September 2 review")).toBeVisible();
});

test("source evidence is reachable without resetting the learning route", async ({ page }) => {
  await page.goto("/listen");
  await page.getByRole("link", { name: /Study A · p. 4/ }).first().click();
  await expect(page).toHaveURL(/\/sources\/study-a\/page\/4$/);
  await expect(page.getByText("physical PDF page 4")).toBeVisible();
  await page.getByRole("link", { name: /Back to listening/ }).click();
  await expect(page).toHaveURL(/\/listen$/);
});

test("320px layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ["/new", "/listen", "/compare", "/topics/spaced-practice/changes", "/explain/feedback"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(1);
  }
});

test("health endpoint distinguishes demo from private live providers", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data.mode).toBe("demo");
  expect(body.data.sampleWorkspace).toBe(true);
});

test("private source import fails truthfully when providers are unavailable", async ({ request }) => {
  const response = await request.post("/api/sources/import-url", {
    headers: { "Idempotency-Key": "e2e-public-source-1" },
    data: { public_pdf_url: "https://example.org/paper.pdf" },
  });
  expect(response.status()).toBe(503);
  const body = await response.json();
  expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
});
