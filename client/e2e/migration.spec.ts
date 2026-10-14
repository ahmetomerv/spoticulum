import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("spoticulum.analytics-consent", "denied");
  });
  await page.route(
    /google-analytics\.com|googletagmanager\.com|fonts\.googleapis\.com/,
    (route) => {
      const url = route.request().url();
      if (url.includes("fonts.googleapis.com")) {
        return route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "",
        });
      }
      return route.fulfill({ status: 204, body: "" });
    },
  );
});

test("home, popup, example modal, Escape, and legal deep link", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("401 (Unauthorized)")
    ) {
      errors.push(message.text());
    }
  });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  const example = page.getByRole("button", { name: "visual snapshot" });
  await example.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Click to see example collection",
  );
  await example.focus();
  await expect(example).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Example:" })).toBeVisible();
  await expect(page.locator('[role="dialog"] img')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(example).toBeFocused();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Ok", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const copyEmail = page.getByRole("button", { name: "Copy email address" });
  await copyEmail.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Click to copy: spoticulum@ahmeto.com",
  );
  await copyEmail.focus();
  await expect(copyEmail).toHaveCSS("outline-style", "solid");
  await page
    .getByRole("link", { name: "Terms of Service & Privacy Policy" })
    .click();
  await expect(page).toHaveURL(/\/legal$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Terms of Service", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const type of ["artists", "tracks"]) {
  test(`Spotify ${type} collection, PNG download and back navigation`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const offsets: number[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().includes("401 (Unauthorized)")
      ) {
        errors.push(message.text());
      }
    });
    const image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzk6QAAAABJRU5ErkJggg==";
    let authenticated = true;
    let profileCalls = 0;
    await page.route("**/api/me", async (route) => {
      profileCalls += 1;
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          json: { error: "Not authenticated" },
        });
        return;
      }
      await route.fulfill({
        json: {
          id: "listener",
          display_name: "Test Listener",
          images: [{ url: image }],
          external_urls: {
            spotify: "https://open.spotify.com/user/listener",
          },
        },
      });
    });
    await page.route("**/api/top/**", async (route) => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get("offset") || 0);
      offsets.push(offset);
      const items = Array.from({ length: 50 }, (_, index) => ({
        id: `${type}-${offset + index}`,
        ...(type === "artists"
          ? { name: `Artist ${offset + index}`, images: [{ url: image }] }
          : {
              album: {
                name: `Album ${offset + index}`,
                images: [{ url: image }],
              },
            }),
      }));
      await route.fulfill({
        json: {
          items,
          offset,
          next: offset < 50 ? `/api/top/${type}?offset=${offset + 50}` : null,
        },
      });
    });
    await page.route("**/api/logout", async (route) => {
      authenticated = false;
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/");
    await expect(
      page.getByText("Test Listener", { exact: true }),
    ).toBeVisible();
    const choice = page.getByRole("button", {
      name: type === "artists" ? "Artists" : "Albums",
      exact: true,
    });
    await expect(choice).toHaveAttribute("type", "button");
    await choice.focus();
    await expect(choice).toHaveCSS("outline-style", "solid");
    await page.keyboard.press(type === "artists" ? "Enter" : "Space");
    await expect(page.locator(".collection-status")).toHaveText(
      `Creating your ${type === "artists" ? "artists" : "albums"} collection.`,
    );
    await expect(
      page.getByRole("button", { name: "Download Collection" }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".collection-status")).toHaveText(
      `Your ${type === "artists" ? "artists" : "albums"} collection is ready. Download Collection and Go Back are available.`,
    );
    const artworkList = page.getByRole("list", {
      name:
        type === "artists"
          ? "Artists whose artwork appears"
          : "Albums represented by your top tracks",
    });
    await expect(artworkList.getByRole("listitem")).toHaveCount(100);
    await expect(artworkList.getByRole("listitem").first()).toHaveText(
      type === "artists" ? "Artist 0" : "Album 0",
    );
    await expect(
      page.getByRole("heading", {
        name: type === "artists" ? /Your top artists/ : /Your top albums/,
      }),
    ).toBeVisible();
    await expect(page.locator("#canvas canvas")).toHaveCount(1);
    expect(profileCalls).toBe(1);
    expect(
      await page.locator("canvas").evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement;
        return { width: element.width, height: element.height };
      }),
    ).toEqual({ width: 700, height: 700 });
    expect(offsets).toEqual([0, 50]);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Collection" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      "testlistener-spotify-collection.png",
    );
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).subarray(0, 8).toString("hex")).toBe(
      "89504e470d0a1a0a",
    );
    await page.getByRole("button", { name: "Go Back" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: "Artists", exact: true }),
    ).toBeVisible();
    const logout = page.getByRole("button", { name: "Log out", exact: true });
    await page.keyboard.press("Tab");
    await logout.focus();
    await expect(logout).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("link", { name: "Connect with Spotify" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("switching from artists back to albums replaces the collection type", async ({
  page,
}) => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzk6QAAAABJRU5ErkJggg==";
  const topTypes: string[] = [];

  await page.route("**/api/me", async (route) => {
    await route.fulfill({
      json: {
        id: "listener",
        display_name: "Test Listener",
        images: [{ url: image }],
        external_urls: {
          spotify: "https://open.spotify.com/user/listener",
        },
      },
    });
  });
  await page.route("**/api/top/**", async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/top\/([^/]+)/);
    topTypes.push(match?.[1] || "");
    const type = match?.[1] || "artists";
    const offset = Number(url.searchParams.get("offset") || 0);
    const items = Array.from({ length: 50 }, (_, index) => ({
      id: `${type}-${offset + index}`,
      ...(type === "artists"
        ? { name: `Artist ${offset + index}`, images: [{ url: image }] }
        : {
            album: {
              name: `Album ${offset + index}`,
              images: [{ url: image }],
            },
          }),
    }));
    await route.fulfill({
      json: {
        items,
        offset,
        next: offset < 50 ? `/api/top/${type}?offset=${offset + 50}` : null,
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Artists", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download Collection" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Go Back" }).click();
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await expect(page).toHaveURL("/collection?collection_request_type=tracks");
  await expect(
    page.getByRole("heading", { name: /Your top albums/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download Collection" }),
  ).toBeVisible({ timeout: 20000 });

  expect(topTypes.slice(-2)).toEqual(["tracks", "tracks"]);
});

test("mobile home retains its layout and modal controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  await page.getByText("visual snapshot", { exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Ok", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("an expired collection session offers an immediate Spotify reconnect", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Spotify authorization expired" },
    }),
  );
  await page.goto("/collection?collection_request_type=artists");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText("Your Spotify session expired. Connect again to continue."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Reconnect with Spotify" }),
  ).toHaveAttribute("href", "/api/login");
});

test("denied Spotify authorization returns a clean cancellation message", async ({
  page,
}) => {
  await page.goto("/?auth_error=access_denied");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText(
      "Spotify authorization was cancelled. You can connect whenever you are ready.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Connect with Spotify" }),
  ).toHaveAttribute("href", "/api/login");
});

test("a Home profile request failure can retry without reauthorizing", async ({
  page,
}) => {
  let profileCalls = 0;
  await page.route("**/api/me", (route) => {
    profileCalls += 1;
    return profileCalls === 1
      ? route.fulfill({ status: 503, json: { error: "Profile unavailable" } })
      : route.fulfill({
          json: {
            id: "listener",
            display_name: "Test Listener",
            images: [],
          },
        });
  });

  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Profile unavailable");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Test Listener", { exact: true })).toBeVisible();
  expect(profileCalls).toBe(2);
});

test("a Spotify rate limit is shown instead of treating the response as collection data", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { id: "listener", display_name: "Test Listener", images: [] },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "12" },
      json: {
        error: "Spotify rate limit reached. Try again in 12 seconds.",
        retryAfter: "12",
      },
    }),
  );
  await page.goto("/collection?collection_request_type=artists");
  await expect(
    page.getByText("Spotify rate limit reached. Try again in 12 seconds."),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("a collection without usable artwork shows an actionable empty state", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { id: "listener", display_name: "Test Listener", images: [] },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({
      json: {
        items: Array.from({ length: 50 }, (_, index) => ({
          id: `artist-${index}`,
          name: `Artist ${index}`,
          images: [],
        })),
        next: null,
      },
    }),
  );

  await page.goto("/collection?collection_request_type=artists");
  await expect(page.getByText(/No artwork is available/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download Collection" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
});

test("an empty top list offers a way back without creating a canvas", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { id: "listener", display_name: "Test Listener", images: [] },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({ json: { items: [], next: null } }),
  );

  await page.goto("/collection?collection_request_type=artists");
  await expect(
    page.getByRole("heading", { name: "No collection data yet" }),
  ).toBeVisible();
  await expect(page.getByText(/no top artists/i)).toBeVisible();
  await expect(page.locator("#canvas canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("missing artwork reuses available art and waits for the logo before download", async ({
  page,
}) => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzk6QAAAABJRU5ErkJggg==";
  let releaseLogo: () => void = () => {};
  let reportLogoRequested: () => void = () => {};
  const logoAllowed = new Promise<void>((resolve) => {
    releaseLogo = resolve;
  });
  const logoRequested = new Promise<void>((resolve) => {
    reportLogoRequested = resolve;
  });
  await page.route("**/spoticulum-logo.png", async (route) => {
    reportLogoRequested();
    await logoAllowed;
    await route.continue();
  });
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        id: "listener",
        display_name: "Test Listener",
        images: [{ url: image }],
      },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({
      json: {
        items: Array.from({ length: 50 }, (_, index) => ({
          id: `artist-${index}`,
          name: `Artist ${index}`,
          images: index === 0 ? [{ url: image }] : [],
        })),
        next: null,
      },
    }),
  );

  try {
    await page.goto("/collection?collection_request_type=artists");
    await logoRequested;
    await page.waitForTimeout(5000);
    await expect(
      page.getByRole("button", { name: "Download Collection" }),
    ).toHaveCount(0);
  } finally {
    releaseLogo();
  }
  await expect(
    page.getByRole("button", { name: "Download Collection" }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#canvas canvas")).toHaveCount(1);
});

test("a failed artwork request cannot enable download", async ({ page }) => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzk6QAAAABJRU5ErkJggg==";
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        id: "listener",
        display_name: "Test Listener",
        images: [{ url: image }],
      },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({
      json: {
        items: Array.from({ length: 50 }, (_, index) => ({
          id: `artist-${index}`,
          name: `Artist ${index}`,
          images: [{ url: "http://127.0.0.1:3101/broken-artwork.png" }],
        })),
        next: null,
      },
    }),
  );
  await page.route("**/broken-artwork.png", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );

  await page.goto("/collection?collection_request_type=artists");
  await expect(page.getByRole("alert")).toContainText(
    /An image could not be loaded/,
  );
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download Collection" }),
  ).toHaveCount(0);
});

test("leaving during image loading stops old drawing and returning creates one collection", async ({
  page,
}) => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzk6QAAAABJRU5ErkJggg==";
  await page.addInitScript(() => {
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    const metrics = window as Window & { collectionDraws?: number };
    metrics.collectionDraws = 0;
    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      ...args: unknown[]
    ) {
      metrics.collectionDraws = (metrics.collectionDraws || 0) + 1;
      return Reflect.apply(originalDrawImage, this, args);
    };
  });
  let releaseArtwork: () => void = () => {};
  let reportArtworkRequested: () => void = () => {};
  const artworkAllowed = new Promise<void>((resolve) => {
    releaseArtwork = resolve;
  });
  const artworkRequested = new Promise<void>((resolve) => {
    reportArtworkRequested = resolve;
  });
  let artworkRequests = 0;
  await page.route("**/held-artwork.png", async (route) => {
    artworkRequests++;
    if (artworkRequests === 1) {
      reportArtworkRequested();
      await artworkAllowed;
    }
    try {
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from(image.split(",")[1] || "", "base64"),
      });
    } catch {
      // The browser can cancel the first image request when the view unmounts.
    }
  });
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        id: "listener",
        display_name: "Test Listener",
        images: [{ url: "/held-artwork.png" }],
      },
    }),
  );
  await page.route("**/api/top/**", (route) =>
    route.fulfill({
      json: {
        items: Array.from({ length: 50 }, (_, index) => ({
          id: `artist-${index}`,
          name: `Artist ${index}`,
          images: [{ url: image }],
        })),
        next: null,
      },
    }),
  );

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Artists", exact: true }).click();
    await artworkRequested;
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Artists", exact: true }),
    ).toBeVisible();
    const drawsAfterLeaving = await page.evaluate(
      () =>
        (window as Window & { collectionDraws?: number }).collectionDraws || 0,
    );
    releaseArtwork();
    await page.waitForTimeout(3200);
    expect(
      await page.evaluate(
        () =>
          (window as Window & { collectionDraws?: number }).collectionDraws ||
          0,
      ),
    ).toBe(drawsAfterLeaving);

    await page.getByRole("button", { name: "Artists", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Download Collection" }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#canvas canvas")).toHaveCount(1);
  } finally {
    releaseArtwork();
  }
});
