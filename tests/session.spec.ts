import { test, expect } from "@playwright/test";
test("session starts, pauses, resumes, changes rhythm and stops", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The rhythm room" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Increase BPM" }).click();
  await expect(page.locator(".bpm-row strong")).toHaveText("85");
  await page.getByRole("button", { name: /wave/ }).click();
  await expect(page.getByRole("button", { name: /wave/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Begin your session" }).click();
  await expect(
    page.getByRole("button", { name: "Pause session" }),
  ).toBeVisible();
  await expect(page.getByLabel("SESSION LENGTH")).toBeDisabled();
  await page.getByRole("button", { name: "Pause session" }).click();
  await expect(
    page.getByRole("button", { name: "Resume session" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume session" }).click();
  await page.getByRole("button", { name: "Stop session" }).click();
  await expect(
    page.getByRole("button", { name: "Begin your session" }),
  ).toBeVisible();
  await expect(page.getByLabel("Session progress")).toHaveAttribute(
    "value",
    "0",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("two-minute automatic guidance and completion", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByLabel("SESSION LENGTH").selectOption("5");
  await page.getByRole("button", { name: "Begin your session" }).click();
  await page.clock.fastForward(121000);
  await expect(page.getByRole("button", { name: /faster/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".dialogue p")).toContainText("faster rhythm");
  await page.getByRole("button", { name: "Pause session" }).click();
  const value = await page.getByLabel("Session progress").getAttribute("value");
  await page.clock.fastForward(20000);
  await expect(page.getByLabel("Session progress")).toHaveAttribute(
    "value",
    value!,
  );
  await page.getByRole("button", { name: "Resume session" }).click();
  await page.clock.fastForward(180000);
  await expect(page.getByRole("button", { name: "Start again" })).toBeVisible();
  await expect(page.getByLabel("Session progress")).toHaveAttribute(
    "value",
    "300",
  );
});
