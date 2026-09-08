import { test, expect } from './fixtures';
import path from 'path';
import { waitForImportedCircuit } from './file-import-helpers';

test('verify ac bracket mode conversion with test file', async ({ page }) => {
  test.setTimeout(60000);
  
  // 1. Load the test-circuit-ac.json file
  await page.goto('/');
  await expect(page.locator('#schematic-canvas')).toHaveAttribute(
    'data-canvas-ready',
    'true',
    { timeout: 10000 },
  );

  // 2. Load Test Circuit File (AC)
  console.log('Step: Load Test Circuit File');
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/test-circuit-ac.json'));
  await waitForImportedCircuit(page, { configCount: 1 });
  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: { processId: string } }>;
    return (await loadState()).appState.processId;
  })).toBe("ptm90");
  
  // 3. Click Simulate Button
  console.log('Step: Click Simulate Button');
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  
  // Wait for Simulate tab content
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });
  
  // 4. Run Simulation
  console.log('Step: Run Simulation');
  await runBtn.click();

  // 5. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible({ timeout: 15000 });
  
  // Wait for Plot Variables list
  await expect(page.getByText(/Plot Variables/i).first()).toBeVisible({ timeout: 20000 });

  // 6. Select only V(output) mag and phase
  console.log('Step: Deselect all signals (Click None)');
  const noneButtons = page.getByRole('button', { name: /None/i });
  const noneCount = await noneButtons.count();
  for (let i = 0; i < noneCount; i++) {
    await noneButtons.nth(i).click();
  }

  // Use the exact names found in the dump
  // Magnitude section
  console.log('Step: Selecting Magnitude Signal');
  const magItem = page.locator('div, label').filter({ hasText: /^v\(output\)\[mag\]$/i }).first();
  await magItem.scrollIntoViewIfNeeded();
  await magItem.click({ force: true });
  
  // Phase section
  console.log('Step: Selecting Phase Signal');
  const phaseItem = page.locator('div, label').filter({ hasText: /^v\(output\)\[phase\]$/i }).first();
  await phaseItem.scrollIntoViewIfNeeded();
  await phaseItem.click({ force: true });
  
  // 7. Final Verification
  console.log('Step: Final Verification');

  // Magnitude and Phase headers should be visible
  await expect(page.getByText('Magnitude', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Phase', { exact: true }).first()).toBeVisible({ timeout: 10000 });

  // Verify Slider
  const sliderLabel = page.getByText('Parameter:', { exact: true }).first();
  await expect(sliderLabel).toBeVisible();
  console.log('Verification Complete');
});
