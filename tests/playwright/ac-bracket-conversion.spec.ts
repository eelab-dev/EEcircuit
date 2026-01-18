import { test, expect } from '@playwright/test';
import path from 'path';

test('verify ac bracket mode conversion with test file', async ({ page }) => {
  // 1. Load the test-circuit-ac.json file
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // 2. Load Test Circuit File
  console.log('Step: Load Test Circuit File');
  
  // Use the hidden file input to upload the test file
  // The file is located at tests/test-circuit-ac.json
  const fileInputs = await page.locator('input[type="file"]').all();
  console.log(`Found ${fileInputs.length} file inputs`);
  for (const input of fileInputs) {
      await input.setInputFiles(path.resolve('tests/test-circuit-ac.json'));
  }
  
  // Wait for schematic to load - check for success message or component visibility
  // Wait for load  // 3. Go to Simulate Tab (should be enabled)
  // 3. Click Simulate Button (in schematic bottom bar)
  console.log('Step: Click Simulate Button');
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  
  // Wait for Simulate tab to be active
  // Wait for Simulate tab to be active and content to load
  // We check for the Run Simulation button which appears in the Simulate tab
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });
  
  // Verify AC is selected (as per file config)
  // Verify AC is selected (as per file config)
  await expect(page.getByText('AC', { exact: true }).first()).toHaveAttribute('data-state', 'checked');
  console.log('Simulate Tab Active and Config Loaded');

  // 4. Run Simulation
  console.log('Step: Run Simulation');
  await runBtn.click();

  // 5. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  // Wait for plot to render headers
  await expect(page.getByText('Magnitude').first()).toBeVisible({ timeout: 20000 });
  console.log('Transited to Plot Tab');

  // 6. Select only V(output) mag and phase
  console.log('Step: Select only V(output)');

  // Open the sidebar if needed (it might be open by default on desktop)
  // But strictly, we can try to find the checkboxes directly if visible.
  
  // Deselect all existing
  const noneButtons = page.getByRole('button', { name: 'None' });
  const count = await noneButtons.count();
  if (count > 0) {
      await noneButtons.nth(0).click(); // None for Mag
      if (count > 1) {
          await noneButtons.nth(1).click(); // None for Phase
      }
  }

  // Select V(output)[mag]
  await page.getByText('V(output)[mag]').click({ force: true });

  // Select V(output)[phase]
  await page.getByText('V(output)[phase]').click({ force: true });
  
  // Verify Slider
  const sliderLabel = page.getByText('Parameter:', { exact: true }).first();
  await expect(sliderLabel).toBeVisible();
  console.log('Parameter Slider Visible');

  // Verification Complete
  console.log('Test logic complete. Waiting 5s as requested...');
  await page.waitForTimeout(5000);
  console.log('Verification Complete');
});
