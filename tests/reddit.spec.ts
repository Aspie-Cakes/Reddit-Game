import { test, expect } from "@playwright/test";
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="purple"/></svg>',
  );
test("loads configured communities and shuffles every fifteen seconds, with pause and skip", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/api/reddit?*", async (route) => {
    const name = new URL(route.request().url()).searchParams.get("subreddit");
    await route.fulfill({
      json: {
        items: [
          {
            id: `${name}-1`,
            subreddit: name,
            title: `${name} first`,
            author: "example",
            kind: "image",
            src: image,
            permalink: `https://www.reddit.com/r/${name}/`,
          },
          {
            id: `${name}-2`,
            subreddit: name,
            title: `${name} second`,
            author: "example",
            kind: "image",
            src: image,
            permalink: `https://www.reddit.com/r/${name}/`,
          },
        ],
      },
    });
  });
  await page.goto("/");
  await expect(page.getByLabel("SUBREDDITS", { exact: false })).toHaveValue(
    /r\/rubyjay.*r\/momonatamada/,
  );
  await expect(
    page.getByRole("button", { name: "Pause slideshow" }),
  ).toBeEnabled();
  const title = await page.locator(".media-caption h3").textContent();
  await page.clock.fastForward(14000);
  await expect(page.locator(".media-caption h3")).toHaveText(title!);
  await page.clock.fastForward(1000);
  await expect(page.locator(".media-caption h3")).not.toHaveText(title!);
  await page.getByRole("button", { name: "Pause slideshow" }).click();
  const paused = await page.locator(".media-caption h3").textContent();
  await page.clock.fastForward(30000);
  await expect(page.locator(".media-caption h3")).toHaveText(paused!);
  await page.getByRole("button", { name: "Next random post" }).click();
  await expect(page.locator(".media-caption h3")).not.toHaveText(paused!);
  await page.getByRole("button", { name: "Resume slideshow" }).click();
  await expect(
    page.getByRole("button", { name: "Pause slideshow" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("shows access failures and saves an edited community list", async ({
  page,
}) => {
  await page.route("**/api/reddit?*", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "Reddit denied public API access." },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".reddit-errors")).toContainText(
    "Reddit denied public API access.",
  );
  await expect(
    page.getByRole("button", { name: "Next random post" }),
  ).toBeDisabled();
  await page.getByLabel("SUBREDDITS", { exact: false }).fill("r/testcommunity");
  await page.getByRole("button", { name: "Load communities" }).click();
  await expect(page.locator(".reddit-errors")).toContainText("r/testcommunity");
  await page.reload();
  await expect(page.getByLabel("SUBREDDITS", { exact: false })).toHaveValue(
    "r/testcommunity",
  );
});
