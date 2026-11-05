import { test, expect } from "@playwright/test";

test("loads the configured Umami script on home and legal pages", async ({
  page,
}) => {
  let scriptRequests = 0;
  await page.route("https://analytics.ahmeto.com/**", (route) => {
    if (route.request().url().endsWith("/script.js")) scriptRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });

  for (const path of ["/", "/legal"]) {
    await page.goto(path);
    const script = page.locator(
      'script[src="https://analytics.ahmeto.com/script.js"]',
    );
    await expect(script).toHaveCount(1);
    await expect(script).toHaveAttribute("defer", "");
    await expect(script).toHaveAttribute(
      "data-website-id",
      "4b0a1c99-6fd2-474d-a7d2-b77b33df9cf2",
    );
  }
  expect(scriptRequests).toBe(2);
});
