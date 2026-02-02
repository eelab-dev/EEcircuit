
import { test, expect } from "@playwright/test";

test("None simulation config should respect manual edits and not inject content", async ({
  page,
}) => {
  // 1. Load the application
  await page.goto("http://localhost:5173/");
  await page.waitForSelector("text=Schematic");

  // 2. Go to Simulation tab (defaults to None)
  await page.getByLabel("Simulate Circuit").click();
  await page.waitForSelector("text=Simulation Configuration");
  
  // Verify "None" is selected
  await expect(page.getByText("None", { exact: true })).toBeChecked();

  // 3. Manually edit the netlist
  // We'll add a comment that shouldn't be there by default
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  
  // Clear file and type a manual netlist
  // Note: We need a valid enough netlist to not crash entirely, but simple enough to verify
  // Use a valid netlist (DC source) to ensure no simulation error
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Control+A"); 
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("* Manual Netlist\nV1 1 0 SIN(0 1 1k)\nR1 1 0 1k\n.tran 10u 1m\n.end");

  // 4. Run Simulation
  const runButton = page.getByRole("button", { name: "Run Simulation" });
  await runButton.click();

  // Wait a bit for potential (unwanted) regeneration
  await page.waitForTimeout(1000);

  // 5. Verify content is still our manual content
  // If the bug exists, it will have regenerated from schematic (overwriting our edits)
  const content = (await page.locator(".view-lines").textContent()) || "";
  const normalizedContent = content.replace(/\u00a0/g, " ");

  expect(normalizedContent).toContain("* Manual Netlist");
  
  // Verify no error toast appears
  await expect(page.locator(".chakra-toast")).toBeHidden();
  expect(normalizedContent).not.toContain(".include modelcard.ptm"); // Default preamble should not be re-injected if we removed it

  // Wait for simulation to finish (which switches to Plot tab)
  // Check that "Plot" tab is selected
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 15000 });

  // Switch back to Simulate tab to check netlist
  await page.getByRole("tab", { name: "Simulation" }).click();

  // 6. Test switching behavior
  // Switch to Transient
  await page.getByText("Transient", { exact: true }).click();
  await page.waitForTimeout(500); // Wait for generation
  
  const contentTran = (await page.locator(".view-lines").textContent()) || "";
  const normalizedTran = contentTran.replace(/\u00a0/g, " ");
  expect(normalizedTran).toContain(".tran");

  // Switch back to None
  const noneRadio = page.getByRole("radio", { name: "None" });
  await expect(noneRadio).toBeVisible();
  await noneRadio.click({ force: true });
  await page.waitForTimeout(500);

  // 7. Verify content is UNCHANGED (should still be the Transient netlist)
  // The user requirement: "leave as it is"
  const contentNone = (await page.locator(".view-lines").textContent()) || "";
  const normalizedNone = contentNone.replace(/\u00a0/g, " ");
  
  expect(normalizedNone).toBe(normalizedTran);

  // 8. Test Transient Simulation (as requested by user)
  // Switch back to Transient
  await page.getByText("Transient", { exact: true }).click();
  await page.waitForTimeout(500);

  // Set valid Transient parameters to ensure simulation success
  await page.getByLabel("Stop Time").fill("10m");
  await page.getByLabel("Time Step").fill("10u");
  await page.waitForTimeout(200); // Wait for debounce/state update

  // Click Run Simulation again
  await page.getByRole("button", { name: "Run Simulation" }).click();

  // Wait for simulation to finish (switches to Plot tab)
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 15000 });

  // Verify plot content appears (e.g., SVG or canvas or some plot element)
  // Assuming there's a canvas or some indicator of plotted data
  // Verify plot content appears
  // Use :visible pseudo-class to find the visible plot canvas (ignoring hidden schematic canvas)
  await expect(page.locator("canvas:visible").first()).toBeVisible();
});
