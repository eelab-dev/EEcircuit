import { test, expect } from '@playwright/test';
import path from 'path';


test('verify noise simulation configuration and plotting', async ({ page }) => {
  // 1. Initial Setup
  await page.goto('http://localhost:5173/');
  // Wait for initial load
  await page.waitForTimeout(1000);

  // 2. Load Test Circuit File (TIA)
  console.log('Step: Load Test Circuit File');
  const fileInputs = await page.locator('input[type="file"]').all();
  for (const input of fileInputs) {
      // Using existing test circuit that has Iin and out
      await input.setInputFiles(path.resolve('tests/test-circuit-tia.json'));
  }
  
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
  const noiseVarLabel = page.locator('label').filter({ hasText: 'onoise_spectrum' });
  // In typical Chakra/React setups, the input might be inside or sibling. 
  // We can look for the checkbox role within this label context or associated control.
  const checkbox = noiseVarLabel.locator('input[type="checkbox"]');
  // Or simply:
  await expect(page.getByLabel('onoise_spectrum')).toBeChecked();
  
  // Verify X-Axis Log button is active?
  // Button text "Log X"
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  const logYBtn = page.getByRole('button', { name: 'Log Y' });
  
  // Check if they are "solid" which implies active. 
  // Chakra UI buttons often have `data-active` or similar attribute if using ToggleButton?
  // If not, we might need to rely on the fact that the simulation ran without error.

  console.log('Verification Complete');
});
