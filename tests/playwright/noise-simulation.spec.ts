import { test, expect } from './fixtures';
import path from 'path';
import { waitForImportedCircuit } from './file-import-helpers';


test('verify noise simulation configuration and plotting', async ({ page }) => {
  // 1. Initial Setup
  await page.goto('/');
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15000 });

  // 2. Load Test Circuit File (TIA)
  console.log('Step: Load Test Circuit File');
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/test-circuit-tia.json'));
  await waitForImportedCircuit(page, { configCount: 0, componentNames: ['X1', 'Cf'] });
  
  // 3. Click Simulate Button to generate netlist and go to Simulate tab
  console.log('Step: Click Simulate Button');
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  
  // Wait for Simulate tab content
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });

  // 4. Switch to Noise Configuration
  console.log('Step: Configure Noise Simulation');
  
  // Select "Noise" simulation type
  // Note: The UI uses RadioCard for simulation types
  await page.getByText('Noise', { exact: true }).click();

  // 5. Configure Noise Parameters
  // Output Net Name: out
  // Input Source: Iin
  // Steps: 20
  // Start Freq: 1
  // Stop Freq: 1G (or 1e9)

  // Net Name and Source are likely native selects if the netlist is parsed
  // We try selectOption first.
  await page.getByLabel('Output Net Name').selectOption('out');
  await page.getByLabel('Input Source').selectOption('Iin');
  
  // Other fields are Inputs
  await page.getByLabel('Steps').fill('20');
  await page.getByLabel('Start Frequency').fill('1');
  await page.getByLabel('Stop Frequency').fill('1G');

  // 6. Run Simulation
  console.log('Step: Run Simulation');
  await runBtn.click();

  // 7. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  
  // Check for Single Canvas vs Dual
  // In Dual mode (AC), we have "Magnitude" and "Phase" titles. 
  // In Single mode (Noise), we should NOT see "Magnitude" header as a specific canvas title
  // (unless the user manually adds it, but by default it's single canvas).
  // Actually, let's verify that we see a canvas
  const canvas = page.locator('canvas:visible');
  // Expect 3 canvases: 1 Main Plot + 1 X-Axis + 1 Y-Axis
  await expect(canvas).toHaveCount(3);

  // 8. Verify Log Axes
  console.log('Step: Verify Log Axes');
  // The Log X and Log Y buttons should be in "solid" variant (active)
  // We can check aria-pressed or data-state if available, or just class/css.
  // The Chakra Button variant='solid' usually means active in this toggle context?
  // Actually, checking the store state via UI is harder.
  // Let's check if the buttons exist and maybe their style?
  // Better: check if "onoise_spectrum" is in the variable list and selected.
  
  // Sidebar variable check
  console.log('Step: Verify Variables');
  // "onoise_spectrum" is the standard noise output variable name in ngspice usually
  await expect(page.getByText('onoise_spectrum')).toBeVisible();
  
  // Verify it is selected (checkbox is checked)
  // Verify it is selected (checkbox is checked)
  const noiseVarLabel = page.locator('label').filter({ hasText: 'onoise_spectrum' });
  const checkbox = noiseVarLabel.locator('input[type="checkbox"]');
  await expect(checkbox).toBeChecked();
  
  // Verify X-Axis Log button is visible (Log X defaults to false unless configured otherwise, but checking presence confirms UI loaded)
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  const logYBtn = page.getByRole('button', { name: 'Log Y' });
  
  await expect(logXBtn).toBeVisible();
  await expect(logYBtn).toBeVisible(); 
  // Chakra UI buttons often have `data-active` or similar attribute if using ToggleButton?
  // If not, we might need to rely on the fact that the simulation ran without error.

  await page.getByRole('tab', { name: 'Simulation' }).click();
  const profiles = page.getByLabel('Saved simulation configuration', { exact: true });
  await expect(profiles.locator('option[value="0"]')).toHaveText('Noise-1 (Noise)');
  await expect(page.getByLabel('Output Net Name')).toHaveValue('out');
  await expect(page.getByLabel('Input Source')).toHaveValue('Iin');
  await expect(page.getByLabel('Steps')).toHaveValue('20');

  console.log('Verification Complete');
});
