import { test, expect } from '@playwright/test';
import * as path from 'path';

test('verify internal signal filtering', async ({ page }) => {
  // 1. Open the app
  await page.goto('http://localhost:5173/');

  // 2. Upload tests/test-subcircuit.json
  const filePath = path.join(process.cwd(), 'tests', 'test-subcircuit.json');
  
  // Wait for the app to load
  await page.waitForTimeout(1000);

  // Enable console logging
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  
  // Set input files on the hidden file input
  console.log('Attempting file upload...');
  await page.locator('input[type="file"]').first().setInputFiles(filePath);

  // Wait for loading to finish
  const spinnerContainer = page.getByText(/Loading schematic|Processing file/);
  try {
    await expect(spinnerContainer).toBeVisible({ timeout: 5000 });
  } catch (e) {
    console.log('Spinner did not appear or was too fast.');
  }
  await expect(spinnerContainer).toBeHidden({ timeout: 15000 });
  
  // Verify file loaded
  // The text might be hidden (e.g. simulation directive), so we check attached to confirm presence
  await expect(page.getByText('Vin').first()).toBeAttached({ timeout: 5000 });
  console.log('Schematic content "Vin" found (attached), upload successful.');

  // 3. Click "Simulate" BUTTON (in BottomBar)
  // This button is responsible for enabling the tab and sending the netlist.
  console.log('Clicking Simulate button...');
  // Use the stable ARIA label added for testing
  const simulateBtn = page.getByRole('button', { name: 'Simulate Circuit' }).first();
  // Dispatch click event via JS to bypass any UI interception issues reliably
  await simulateBtn.dispatchEvent('click');

  // 5. Click "Run Simulation"
  // Wait for simulation config OR error toast
  console.log('Waiting for Simulation Configuration or Error Toast...');
  try {
    // Check if error toast appears
    const errorToast = page.getByText(/Netlist Generation Failed|Netlist Error/);
    if (await errorToast.isVisible({ timeout: 2000 })) {
       console.error('ERROR: Netlist generation failed. Schematic might be invalid.');
       // Capture detailed error if possible
       const errorDesc = page.getByText(/Fix errors before simulating|Unable to generate netlist/);
       if (await errorDesc.isVisible()) {
          console.error(`Error details: ${await errorDesc.textContent()}`);
       }
       throw new Error('Netlist generation failed');
    }
    
    // Check if Transient configuration option appears
    const transientRadio = page.getByRole('radio', { name: 'Transient' });
    await transientRadio.waitFor({ timeout: 10000 });
    await transientRadio.check({ force: true });
    
  } catch (e) {
    console.log('Timed out waiting for configuration or encountered error.');
    throw e;
  }

  console.log('Running simulation...');
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i }).first();
  await runBtn.click();

  // 6. Verify signals in Plot tab
  // This should automatically switch to Plot tab
  console.log('Waiting for plot...');
  await page.getByRole('tab', { name: 'Plot' }).waitFor({ state: 'visible' });
  
  // Verify internal filtering details
  // "v(x1...)" should be hidden by default
  await expect(page.getByText('v(x1', { exact: false })).toBeHidden();
  await expect(page.getByText('v(in)')).toBeVisible();

  // 7. Toggle settings to show internal signals
  console.log('Toggling settings...');
  await page.getByRole('button', { name: /Settings/i }).click();
  // "Plotting" is a button in the sidebar
  await page.getByRole('button', { name: 'Plotting Settings' }).click();
  
  // Click the text/label directly as check() on hidden input can be flaky with custom UI interceptions
  // This simulates a user clicking the label text
  await page.getByText('Show internal subcircuit signals').click();
  
  await page.getByRole('button', { name: 'Save' }).click();

  // 8. Verify internal signals VISIBLE
  await expect(page.getByText('v(x1', { exact: false }).first()).toBeVisible();

  // 9. Disable setting
  await page.getByRole('button', { name: /Settings/i }).click();
  await page.getByRole('button', { name: 'Plotting Settings' }).click();
  await page.getByText('Show internal subcircuit signals').click();
  await page.getByRole('button', { name: 'Save' }).click();

  // 10. Verify internal signals HIDDEN
  await expect(page.getByText('v(x1', { exact: false })).toBeHidden();
});
