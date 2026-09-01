import { test, expect } from './fixtures';
import * as path from 'path';
import { waitForImportedCircuit } from './file-import-helpers';

test('verify internal signal filtering', async ({ page }) => {
  // 1. Open the app
  await page.goto('/');
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15000 });

  // 2. Upload tests/test-subcircuit.json
  const filePath = path.join(process.cwd(), 'tests', 'test-subcircuit.json');
  

  // Enable console logging
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  
  // Set input files on the hidden file input
  console.log('Attempting file upload...');
  await page.locator('input[type="file"]').first().setInputFiles(filePath);

  await waitForImportedCircuit(page, { configCount: 2 });
  
  // The schematic is rendered on a canvas, so component labels are not DOM
  // text. Canvas readiness plus the schematic action bar confirms that the
  // editor survived the asynchronous file load without relying on a hidden
  // simulation tab being mounted.
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Simulate Circuit' }).first()).toBeAttached({ timeout: 5000 });
  console.log('Schematic canvas is ready after upload.');

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
    // Verify Transient option is visible, then click the visible label wrapper
    // The native radio might be hidden or "glitched" for automation in this UI library
    const transientText = page.getByText('Transient', { exact: true });
    await transientText.waitFor({ timeout: 10000 });
    await transientText.click({ force: true });
    
  } catch (_e) {
    console.log('Timed out waiting for configuration or encountered error.');
    throw _e;
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
