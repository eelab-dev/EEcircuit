import { test, expect } from '@playwright/test';
import path from 'path';

test('verify noise settings do not linger in transient simulation', async ({ page }) => {
  test.setTimeout(120000);
  // 1. Initial Setup
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // 2. Load TIA Circuit
  console.log('Step: Load Test Circuit File');
  const fileInputs = await page.locator('input[type="file"]').all();
  for (const input of fileInputs) {
      await input.setInputFiles(path.resolve('tests/test-circuit-tia.json'));
  }
  
  // 3. Go to Simulate Tab
  console.log('Step: Go to Simulate Tab');
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  
  // Wait for Run button
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });

  // 4. Configure and Run Noise Simulation
  console.log('Step: Configure and Run Noise Simulation');
  await page.getByText('Noise', { exact: true }).click();
  await page.getByLabel('Output Net Name').selectOption('out');
  await page.getByLabel('Input Source').selectOption('Iin');
  await page.getByLabel('Steps').fill('10');
  await page.getByLabel('Start Frequency').fill('1');
  await page.getByLabel('Stop Frequency').fill('100');
  
  await runBtn.click();

  // Verify Noise Plotting State
  console.log('Step: Verify Noise Plot State');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();

  // We expect 'onoise_spectrum' to be present
  await page.waitForTimeout(2000); // Wait for plot render
  await expect(page.getByText('onoise_spectrum')).toBeVisible({timeout: 10000});

  // Verify Log axes are applied (since Noise defaults to Log-Log)
  // Check if Log X button is visible (it is a button, not a checkbox)
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  await expect(logXBtn).toBeVisible();

  // 5. Switch back to Simulate for Transient
  console.log('Step: Switch back to Simulate for Transient');
  await page.getByRole('tab', { name: 'Simulation' }).click();
  
  // 6. Configure Transient Simulation
  console.log('Step: Configure Transient');
  await page.getByText('Transient', { exact: true }).click();
  // Stop Time: 100u, Step: 10n
  await page.getByLabel('Stop Time').fill('100u');
  await page.getByLabel('Time Step').fill('10n');
  
  // 7. Run Transient Simulation
  console.log('Step: Run Transient Simulation');
  await runBtn.click();

  // 8. Verify Plot Tab for Transient
  console.log('Step: Verify Transient Plot State');
  await expect(plotTab).toBeVisible();

  // ASSERTION FOR BUG:
  // "onoise_spectrum" should NOT be visible. 
  // If the previous simulation settings linger, this variable might still be in the list.
  const noiseVar = page.getByText('onoise_spectrum');
  if (await noiseVar.isVisible()) {
    console.log('BUG DETECTED: onoise_spectrum is still visible in Transient simulation results');
  } else {
    console.log('CONFIRMED: onoise_spectrum is NOT visible');
  }

  // Expect 'v(out)' to be visible
  await expect(page.getByText('v(out)')).toBeVisible();

  // Strict Assertion: onoise_spectrum must not be visible
  await expect(noiseVar).not.toBeVisible();

  // 9. Switch back to Simulate for AC
  console.log('Step: Switch back to Simulate for AC');
  
  // Wait for any existing toasts to disappear to avoid click interception
  await expect(page.locator('.chakra-toast')).not.toBeVisible({ timeout: 10000 });
  
  await page.getByRole('tab', { name: 'Simulation' }).click();

  // 10. Configure AC Simulation
  console.log('Step: Configure AC');
  await page.getByText('AC', { exact: true }).click();
  
  // Wait for config form to appear
  await expect(page.getByLabel('Start Frequency')).toBeVisible();

  // Set AC Parameters: Start: 1k, Stop: 10M, Steps: 10
  // Use Vsup as source to avoid bracket operation in Iin
  // Note: AcConfig label is 'Source', not 'Input Source'
  await page.getByLabel('Source').selectOption('Vsup');
  await page.getByLabel('Start Frequency').fill('1k');
  await page.getByLabel('Stop Frequency').fill('10M');
  await page.getByLabel('Steps Number').fill('10');
  
  // 11. Run AC Simulation
  console.log('Step: Run AC Simulation');
  await expect(runBtn).toBeEnabled();
  
  // Wait for any new toasts (if any) or ensure clean state
  await expect(page.locator('.chakra-toast')).not.toBeVisible({ timeout: 10000 });
  
  console.log('Attempting to click Run button...');
  await runBtn.click();
  console.log('Run button clicked.');
  
  // 12. Verify Plot Tab for AC
  console.log('Step: Verify AC Plot State');
  await expect(plotTab).toBeVisible();

  // Verify dual plot headers for AC (Magnitude / Phase)
  // This confirms that AC mode was correctly detected and switched to
  await expect(page.getByText('Magnitude').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Phase').first()).toBeVisible();
  
  // Verify expected variable v(out)[mag]
  await expect(page.locator('div, label').filter({ hasText: /^v\(out\)\[mag\]$/i }).first()).toBeVisible();

  // Wait 5 seconds before closing
  await page.waitForTimeout(5000);
});
