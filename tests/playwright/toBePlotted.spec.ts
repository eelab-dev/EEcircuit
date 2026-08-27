import { test, expect } from "./fixtures";

test("To Be Plotted variables are updated when schematic nets change", async ({ page }) => {
  // 1. Load the application
  await page.goto("/");

  // Wait for the schematic canvas to be ready
  const schematicCanvas = page.locator("canvas#schematic-canvas");
  await expect(schematicCanvas).toBeVisible();

  // 2. Load Demo Circuit
  await page.getByLabel("New Schematic").first().click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

  // 3. Go to Simulate tab to generate netlist
  const simulateBtn = page.getByRole("button", { name: /Simulate/i }).first();
  await simulateBtn.click();
  const simConfigHeader = page.getByText("Simulation Configuration", { exact: false }).first();
  await expect(simConfigHeader).toBeVisible({ timeout: 10000 });

  // 4. Mark a net as "To be plotted"
  // Click the "To Be Plotted" button
  await page.getByRole("button", { name: /To Be Plotted/i }).click();
  
  // Wait for transition back to schematic
  await expect(schematicCanvas).toBeVisible();

  // Find center of canvas
  const box = await schematicCanvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // We need to find a wire to click on. We'll scan around the center
  // and check the bottom bar text to see when we're hovering over a wire (e.g., "output" or "input")
  let targetX = cx;
  let targetY = cy;
  let foundNetName = "";
  
  // Start from center and scan outwards in a grid
  scanLoop:
  // The fitted demo is intentionally laid out with wires above/beside the
  // source symbols. Search the usable canvas rather than coupling the demo
  // geometry to a narrow center window.
  for (let dy = -320; dy <= 40; dy += 30) {
    for (let dx = -600; dx <= 600; dx += 30) {
      await page.mouse.move(cx + dx, cy + dy);
      await page.waitForTimeout(15);
      
      // Look for a button in the bottom bar that has a dash (e.g., "output - 2")
      // excluding the coordinate button "X:  0, Y:  0"
      const pointerInfoBtns = await page.locator('button').filter({ hasText: /.* - \d+/ }).all();
      
      for (const btn of pointerInfoBtns) {
        if (await btn.isVisible()) {
          const text = await btn.innerText();
          if (text && !text.includes('X:')) {
            // Only accept the named wire entries. Component names such as
            // `vin` also contain "in", but selecting those would not update
            // the transient to-be-plotted net list.
            if (/^(output|input)\s*-\s*\d+/i.test(text.trim())) {
              targetX = cx + dx;
              targetY = cy + dy;
              const splitText = text.split('-');
              if (splitText[0]) {
                foundNetName = splitText[0].trim();
              } else {
                foundNetName = "unknown";
              }
              break scanLoop;
            }
          }
        }
      }
    }
  }

  // Click the found net
  await page.mouse.move(targetX, targetY);
  await page.mouse.click(targetX, targetY);
  await expect(page.getByText(/Selected \(1\):/)).toBeVisible({ timeout: 5000 });

  // Exit "To be plotted" mode
  await page.keyboard.press("Escape");

  // 5. Verify it's in the plot list
  // Go to Simulate tab
  await page.getByRole("tab", { name: /simulation/i }).first().click();

  // Open the "To Be Plotted" dropdown to view the items
  await page.getByRole("button", { name: /To Be Plotted/ }).click();
  
  // The exact net name should be in the dropdown
  await expect(page.getByRole("menuitem", { name: new RegExp(`Remove .*${foundNetName}.* from To Be Plotted`, 'i') })).toBeVisible();

  // Press Escape to close dropdown
  await page.keyboard.press("Escape");

  // 6. Go back and rename the net (or delete it)
  await page.getByRole("tab", { name: /schematic/i }).first().click();
  await expect(schematicCanvas).toBeVisible();

  // Switch to Text mode
  await page.keyboard.press("t");
  // Click on the same place
  await page.mouse.click(targetX, targetY);
  // Type a new name
  await page.keyboard.type("renamed_net");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");

  // Switch back to simulate to regenerate netlist
  // The old "to be plotted" variable should be removed automatically
  await page.getByRole("button", { name: /Simulate/i }).first().click();

  // The dropdown shouldn't have the old net anymore
  // In fact, if we renamed the only plotted net, the menu might go back to "To Be Plotted" without the dropdown
  // Let's verify that the menuitem is not visible
  await expect(page.getByRole("menuitem", { name: /Remove .* from To Be Plotted/ })).not.toBeVisible();
});
