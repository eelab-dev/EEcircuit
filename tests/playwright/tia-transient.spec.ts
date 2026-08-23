import { test, expect } from './fixtures';
import path from 'path';

test('verify tia transient simulation', async ({ page }) => {
  // 1. Initial Setup
  await page.goto('/');

  // 2. Load Test Circuit File (TIA)
  console.log('Step: Load Test Circuit File');
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/test-circuit-tia.json'));
  
  // 3. Click Simulate Button
  console.log('Step: Click Simulate Button');
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  
  // Wait for Simulate tab content
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });

  // 4. Configure Transient Simulation
  console.log('Step: Configure Transient Simulation');
  
  // Select "Transient" simulation type
  await page.getByText('Transient', { exact: true }).click();

  // 5. Configure Transient Parameters
  // Stop Time: 100u
  // Step Time: 10n
  await page.getByLabel('Stop Time').fill('100u');
  await page.getByLabel('Time Step').fill('10n');
  
  // 6. Run Simulation
  console.log('Step: Run Simulation');
  await runBtn.click();

  // 7. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  
  // Check for canvas presence
  const canvas = page.locator('canvas:visible');
  // Expect 3 canvases: 1 Main Plot + 1 X-Axis + 1 Y-Axis
  await expect(canvas).toHaveCount(3);

  // Verify at least one variable is listed
  console.log('Step: Verify Variables');
  await expect(page.getByText('v(out)')).toBeVisible();
  
  console.log('Verification Complete');
  
});
