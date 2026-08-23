import { test, expect } from './fixtures';

test('strict verify ac plot signal separation', async ({ page }) => {
  // Enable console logging with filter
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('EEcircuitApp') || text.includes('Step:') || text.includes('Simulation Result') || text.includes('DEBUG')) {
      console.log(`BROWSER LOG: ${text}`);
    }
  });

  // 1. Open the app
  await page.goto('/');

  // 2. Load Demo Circuit (Schematic Tab)
  console.log('Step: Load Demo Circuit');
  await page.getByLabel('New Schematic').first().click();
  await page.getByRole('button', { name: 'Load Demo' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  console.log('Demo Loaded');

  // 3. Click Simulate Button (Transition to Simulate Tab)
  console.log('Step: Go to Simulate Tab');
  const simulateBtn = page.getByRole('button', { name: /Simulate/i }).first();
  await simulateBtn.click();
  
  // Verify we are on Simulate tab (by checking presence of Sim Config)
  const simConfigHeader = page.getByText('Simulation Configuration', { exact: false }).first();
  await expect(simConfigHeader).toBeVisible({ timeout: 10000 });
  console.log('Transited to Simulate Tab');

  // 4. Select AC Simulation
  console.log('Step: Select AC');
  // Click the label "AC" to select it (handling custom radio UI)
  const acLabel = page.getByText('AC', { exact: true });
  await acLabel.click();
  
  // Verify AC fields appear
  await expect(page.getByLabel('Start Frequency')).toBeVisible();
  console.log('AC Selected');

  // 5. Configure AC Parameters
  // Source: "vin"
  console.log('Step: Configure AC Parameters');
  const sourceField = page.getByLabel('Source');
  const tagName = await sourceField.evaluate(el => el.tagName.toLowerCase());
  if (tagName === 'select') {
    // If select, try selecting option with text "vin" or "V1" or first available
    const options = await sourceField.innerText();
    console.log('Available sources:', options);
    // Try to select index 1 (detected source)
    await sourceField.selectOption({ index: 1 });
  } else {
    // If input, type "V1" (Standard for demo) or "Vin"
     await sourceField.fill('V1'); 
  }

  // Sweep Type: Decade (dec)
  // "Sweep Type" label, select option "dec"
  await page.getByLabel('Sweep Type').selectOption('dec');

  // Start Frequency: 1
  await page.getByLabel('Start Frequency').fill('1');

  // Stop Frequency: 1G
  await page.getByLabel('Stop Frequency').fill('1G');

  // Steps Number: 20
  await page.getByLabel('Steps Number').fill('20');
  
  console.log('AC Params Configured: 1Hz-1GHz, 20 steps');

  // 6. Run Simulation (Transition to Plot Tab)
  console.log('Step: Run Simulation');
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await runBtn.click();

  // 7. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  // Wait for Plot tab to be active
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  // Ensure it's active (aria-selected="true" usually, or just check content)
  // The sidebar "Plot Variables" should appear
  await expect(page.getByText('Plot Variables')).toBeVisible({ timeout: 20000 });
  console.log('Transited to Plot Tab');

  // 8. Verify AC Plot Separation
  console.log('Step: Verify Plot Separation');
  
  // Verify "Magnitude" Header
  const magnitudeHeader = page.getByText('Magnitude', { exact: true }).first();
  
  if (await magnitudeHeader.isVisible()) {
      console.log('Magnitude Header Visible');
  } else {
      console.log('Magnitude Header NOT Visible');
      // ... checks ...
      
      // Fail with useful message
      await expect(magnitudeHeader).toBeVisible();
  }

  // Verify "Phase" Header
  const phaseHeader = page.getByText('Phase', { exact: true }).first();
  await expect(phaseHeader).toBeVisible();
  console.log('Phase Header Visible');

  // Verify Signal Separation
  // Check for presence of variables in the plot/sidebar
  // Note: ScientificPlot might display full names e.g. v(output)[mag]
  // Using loosely matching or multiple options if uncertain, but debug result showed v(output)
  const magVar = page.getByText(/v\(output\)\[mag\]|v\(out\)\[mag\]/i).first();
  await expect(magVar).toBeVisible();
  
  const phaseVar = page.getByText(/v\(output\)\[phase\]|v\(out\)\[phase\]/i).first();
  await expect(phaseVar).toBeVisible();

  console.log('Verification Complete');
});
