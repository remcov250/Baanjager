import { expect, test, type Page } from "@playwright/test";

const USER = "tester";
const PASSWORD = "correct horse battery staple";

// Tests run in order and share one server and one database: the mobile
// project runs the whole file first, then desktop runs it against the same
// data. signIn() therefore handles both the first visit (/setup) and every
// visit after it (/login), and test data is named per project.
test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/");
  if (page.url().includes("/setup")) {
    await page.getByLabel("Gebruikersnaam").fill(USER);
    await page.getByLabel("Wachtwoord", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Wachtwoord herhalen").fill(PASSWORD);
    await page.getByRole("button", { name: "Account aanmaken" }).click();
  } else if (page.url().includes("/login")) {
    await page.getByLabel("Gebruikersnaam").fill(USER);
    await page.getByLabel("Wachtwoord", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Inloggen" }).click();
  }
  await expect(page).toHaveURL(/\/$/);
}

test("first visit goes to setup, creates the account and lands on the list", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("no horizontal scrolling on any page", async ({ page }) => {
  await signIn(page);
  for (const path of ["/", "/vacancies", "/vacancies/new", "/criteria", "/profile", "/sources", "/settings", "/ai"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("adds a vacancy with a verdict and reason", async ({ page }, testInfo) => {
  await signIn(page);
  const employer = `Acme ${testInfo.project.name}`;
  await page.goto("/vacancies/new");
  await page.getByLabel("Werkgever", { exact: true }).fill(employer);
  await page.getByLabel("Functietitel").fill("Analyst");
  await page.getByLabel("Laag").selectOption("local");
  await page.getByLabel("Kantoordagen (per week)").fill("2");
  await page.getByText("Match", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Match", exact: true })).toBeChecked();
  await page.getByLabel("Reden", { exact: true }).fill("Geen Duits vereist, twee kantoordagen, lokaal.");
  await page.getByRole("button", { name: "Opslaan" }).first().click();

  await expect(page).toHaveURL(/\/vacancies\/\d+\?saved=1/);
  await expect(page.getByText("Opgeslagen")).toBeVisible();
  await expect(page.getByRole("heading", { name: new RegExp(employer) })).toBeVisible();
});

test("turns an insight into a rule linked to the vacancy", async ({ page }, testInfo) => {
  await signIn(page);
  const employer = `Acme ${testInfo.project.name}`;
  await page.goto("/vacancies");
  await page.getByRole("link", { name: employer }).first().click();
  await expect(page).toHaveURL(/\/vacancies\/\d+/);

  const ruleText = `Duits vereist (${testInfo.project.name})`;
  await page.getByLabel("Soort").selectOption("knockout");
  await page.getByLabel("Regel", { exact: true }).fill(ruleText);
  await page.getByRole("button", { name: "Regel toevoegen" }).click();
  await expect(page.getByText("Regel toegevoegd aan de criteria.")).toBeVisible();
  await expect(page.getByText(ruleText).first()).toBeVisible();

  await page.goto("/criteria");
  // Rules are folded to their first line; open this one to see where it came from.
  await page.getByText(ruleText).first().click();
  await expect(page.getByRole("link", { name: new RegExp(employer) })).toBeVisible();
});

test("filters the list and hides dropped vacancies by default", async ({ page }, testInfo) => {
  await signIn(page);
  const employer = `Acme ${testInfo.project.name}`;
  await page.goto("/vacancies");
  await expect(page.getByRole("link", { name: employer }).first()).toBeVisible();

  await page.getByLabel("Oordeel").selectOption("no_match");
  await page.getByRole("button", { name: "Zoeken" }).click();
  await expect(page.getByText("Nog geen vacatures")).toBeVisible();

  await page.goto("/vacancies");
  await page.getByRole("link", { name: employer }).first().click();
  await expect(page).toHaveURL(/\/vacancies\/\d+/);
  await page.getByLabel("Status", { exact: true }).selectOption("dropped");
  await page.getByRole("button", { name: "Opslaan" }).first().click();
  // WebKit reports the new URL while the redirect is still in flight; wait for
  // the page to have actually rendered before navigating away.
  await expect(page.getByText("Opgeslagen")).toBeVisible();
  await page.goto("/vacancies");
  await expect(page.getByRole("link", { name: employer })).toHaveCount(0);
  await page.getByText("Toon afgevallen en afgewezen").click();
  await page.getByRole("button", { name: "Zoeken" }).click();
  await expect(page.getByRole("link", { name: employer }).first()).toBeVisible();
});

test("table on desktop, cards on mobile", async ({ page, isMobile }) => {
  await signIn(page);
  await page.goto("/vacancies?closed=1");
  await expect(page.locator("table")).toBeVisible({ visible: !isMobile });
});

test("wrong password is refused, logout works", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Uitloggen" }).first().click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Gebruikersnaam").fill(USER);
  await page.getByLabel("Wachtwoord", { exact: true }).fill("nope nope nope");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page.getByText("klopt niet")).toBeVisible();

  await page.goto("/criteria");
  await expect(page).toHaveURL(/\/login\?next=%2Fcriteria/);
});

test("evidence from the assistant and a linked CV show on the detail page", async ({ page, request }, testInfo) => {
  const headers = { Authorization: "Bearer e2e-token" };
  const employer = `Acme ${testInfo.project.name}`;
  const list = await (await request.get(`/api/v1/vacancies?q=${encodeURIComponent(employer)}&closed=1`, { headers })).json();
  const id = list[0].id;

  const patched = await request.patch(`/api/v1/vacancies/${id}`, {
    headers,
    data: {
      verdict: "uncertain",
      analysis: {
        strong: [{ requirement: "Contractenrecht", evidence: "profiel: 4 jaar contracten" }],
        unknown: [{ requirement: "Duits C1" }],
        terms: ["Contractenrecht", "Legal Counsel"],
      },
    },
  });
  expect(patched.ok()).toBeTruthy();
  const linked = await request.put(`/api/v1/vacancies/${id}/cv`, {
    headers,
    data: { resumeId: `e2e-${testInfo.project.name}`, url: "https://cv.example/e2e" },
  });
  expect(linked.ok()).toBeTruthy();

  await signIn(page);
  await page.goto(`/vacancies/${id}`);
  const analysis = page.getByTestId("analysis");
  await expect(analysis).toBeVisible();
  await expect(analysis.getByText("Sterk", { exact: true })).toBeVisible();
  await expect(analysis.getByText("Onbekend", { exact: true })).toBeVisible();
  await expect(analysis.getByText("Duits C1")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Onzeker" })).toBeChecked();
  await expect(page.getByRole("link", { name: "CV" })).toHaveAttribute("href", "https://cv.example/e2e");

  const context = await (await request.get(`/api/v1/vacancies/${id}/context`, { headers })).json();
  expect(context.assessment.matchLevel).toBe("uncertain");
  expect(context.cv.resumeId).toBe(`e2e-${testInfo.project.name}`);
  expect(context.policy).toContain("never invent");
});

test("API needs the token and has no delete", async ({ request }) => {
  const denied = await request.get("/api/v1/summary");
  expect(denied.status()).toBe(401);

  const summary = await request.get("/api/v1/summary", {
    headers: { Authorization: "Bearer e2e-token" },
  });
  expect(summary.ok()).toBeTruthy();
  const body = await summary.json();
  expect(body.total).toBeGreaterThanOrEqual(1);
  expect(body.activeRules).toBeGreaterThanOrEqual(1);

  const del = await request.delete("/api/v1/vacancies/1", {
    headers: { Authorization: "Bearer e2e-token" },
  });
  expect(del.status()).toBe(405);
});
