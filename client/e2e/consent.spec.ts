import { test, expect } from "@playwright/test";

test("analytics notice supports keyboard choices, policy navigation, and withdrawal", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "development",
    "Test analytics ID is configured for the development server",
  );

  let analyticsScriptRequests = 0;
  await page.route(/googletagmanager\.com|fonts\.googleapis\.com/, (route) => {
    if (route.request().url().includes("googletagmanager.com")) {
      analyticsScriptRequests += 1;
    }
    return route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/");
  const notice = page.getByRole("region", { name: "Optional analytics" });
  const settings = page.getByRole("button", { name: "Privacy settings" });
  await expect(notice).toBeVisible();
  await expect(
    notice.getByRole("heading", { name: "Optional analytics" }),
  ).toBeFocused();
  expect(analyticsScriptRequests).toBe(0);

  await page.keyboard.press("Tab");
  await expect(
    notice.getByRole("link", { name: "Privacy Policy" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(notice.getByRole("button", { name: "Decline" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(notice).toHaveCount(0);
  await expect(settings).toBeFocused();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("spoticulum.analytics-consent"),
    ),
  ).toBe("denied");
  expect(analyticsScriptRequests).toBe(0);

  await page.keyboard.press("Enter");
  await expect(
    notice.getByRole("heading", { name: "Optional analytics" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/legal#privacy-policy$/);
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", exact: true }),
  ).toBeFocused();

  await settings.focus();
  await page.keyboard.press("Enter");
  await expect(
    notice.getByRole("heading", { name: "Optional analytics" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    notice.getByRole("button", { name: "Allow analytics" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(settings).toBeFocused();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("spoticulum.analytics-consent"),
    ),
  ).toBe("granted");
  await expect.poll(() => analyticsScriptRequests).toBe(1);

  await page.keyboard.press("Enter");
  await expect(
    notice.getByRole("heading", { name: "Optional analytics" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(settings).toBeFocused();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("spoticulum.analytics-consent"),
    ),
  ).toBe("denied");
  expect(await page.evaluate(() => window["ga-disable-G-PLAYWRIGHT"])).toBe(
    true,
  );
  expect(analyticsScriptRequests).toBe(1);
});
