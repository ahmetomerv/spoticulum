import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("spoticulum.analytics-consent", "denied");
  });
});

test("home does not download collection or legal route modules", async ({
  page,
}) => {
  const routeModules: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/CollectionCanvas|\/Legal[.-]/.test(url)) routeModules.push(url);
  });

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  expect(routeModules).toEqual([]);
});

test("a direct legal load announces the page until the terms are ready", async ({
  page,
}) => {
  await page.route(/\/Legal[.-]/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });

  await page.goto("/legal");
  await expect(
    page.getByRole("status", { name: "Loading page" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Terms of Service" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/Spoticulum is an independent service/),
  ).toBeVisible();
});
