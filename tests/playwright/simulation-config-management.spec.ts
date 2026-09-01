import { expect, test } from "@playwright/test";

test("saved simulation configurations can be created, selected, renamed, and deleted", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByLabel("New Schematic").first().click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByText("Simulation Configuration", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByText("Transient", { exact: true }).click();
  const configSelect = page.getByLabel("Saved simulation configuration", { exact: true });
  await expect(configSelect).toBeVisible();
  await page.getByLabel("Stop Time").fill("10u");
  await page.getByLabel("Time Step").fill("100n");
  await expect(configSelect).toHaveValue("0");
  await expect(configSelect.locator('option[value="0"]')).toHaveText("Transient-1 (Transient)");

  await page.getByRole("button", { name: "Edit configuration name" }).click();
  await page.getByLabel("Configuration name", { exact: true }).fill("Startup sweep");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(configSelect.locator('option[value="0"]')).toHaveText("Startup sweep (Transient)");

  await page.getByRole("button", { name: "Add configuration" }).click();
  await page.getByLabel("New configuration name").fill("Long run");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(configSelect).toHaveValue("1");
  await expect(configSelect.locator('option[value="1"]')).toHaveText("Long run (Transient)");

  await page.getByRole("button", { name: "Add configuration" }).click();
  await page.getByLabel("New configuration name").fill("Final run");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(configSelect).toHaveValue("2");

  await configSelect.selectOption({ label: "Long run (Transient)" });

  await page.getByRole("button", { name: "Delete configuration" }).click();
  await expect(configSelect).toHaveValue("0");
  await expect(configSelect.locator('option[value="0"]')).toHaveText("Startup sweep (Transient)");
  await expect(configSelect.locator("option", { hasText: "Long run" })).toHaveCount(0);
  await expect(page.getByLabel("Stop Time")).toHaveValue("10u");
  await expect(page.getByLabel("Time Step")).toHaveValue("100n");

  await page.reload();
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByText("Simulation Configuration", { exact: true })).toBeVisible({ timeout: 10_000 });
  const restoredSelect = page.getByLabel("Saved simulation configuration", { exact: true });
  await expect(restoredSelect).toHaveValue("0");
  await expect(restoredSelect.locator('option[value="0"]')).toHaveText("Startup sweep (Transient)");
});
