import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('run simulation workflow', async ({ page }) => {
  // Load the page
  await page.goto('http://localhost:5173/');

  // Click on the simulation/netlist button
  const simulateNetlistButton = page.getByRole('button', { name: 'Simulate (Netlist)' });
  await simulateNetlistButton.click();

  // Select the "None" simulation option in the sim tab
  // Wait for the Simulate tab to be active
  await expect(page.getByRole('tab', { name: 'Simulate' })).toBeVisible();
  
  const simulationConfigGroup = page.getByRole('radiogroup', { name: /Simulation Configuration/i });
  const radioLabel = simulationConfigGroup
      .locator("label")
      .filter({ hasText: "None" })
      .first();
  await radioLabel.click();

  // Replace all the text in editor with the ./test/lib/test-circuit.cir
  // Read the content of the circuit file
  // Note: Adjust the path relative to where the test is running or use absolute path if needed.
  // Read the content of the circuit file
  const circuitPath = path.join(process.cwd(), 'tests', 'test-circuit.cir');
  const circuitContent = fs.readFileSync(circuitPath, 'utf-8');
  console.log(`[Test Debug] Circuit content length: ${circuitContent.length}`);

  // Interacting with Monaco Editor
  const monacoEditor = page.locator('.monaco-editor').first();
  await monacoEditor.click();

  // Wait for Monaco to be ready
  await page.waitForFunction(() => {
    // @ts-ignore
    return window.monaco && window.monaco.editor && window.monaco.editor.getModels().length > 0;
  }, null, { timeout: 10000 });

  // Set content via Monaco API directly for reliability
  const success = await page.evaluate((text) => {
    // @ts-ignore
    if (window.monaco && window.monaco.editor.getModels().length > 0) {
      // @ts-ignore
      const model = window.monaco.editor.getModels()[0];
      model.setValue(text);
      return true;
    }
    return false;
  }, circuitContent);

  if (!success) {
    throw new Error('Failed to set editor content via Monaco API');
  }

  // Verify content was set
  const editorContent = await page.evaluate(() => {
    // @ts-ignore
    return window.monaco?.editor.getModels()[0].getValue();
  });
  console.log(`[Test Debug] Editor content verification length: ${editorContent?.length}`);

  expect(editorContent).toContain('.tran 1u 1m');

  // Run the simulation
  await page.getByRole('button', { name: 'Run Simulation' }).click();

  console.log('[Test Debug] Waiting for simulation to complete...');
  // Wait to capture logs and ensure simulation finishes
  await page.waitForTimeout(20000); 

  const duration = await page.evaluate(() => {
    // @ts-ignore
    return window.lastSimulationDuration;
  });
  console.log(`[Test Result] Captured Simulation Duration: ${duration}ms`); 

  // Optional: Add assertion to verify simulation ran (e.g., check for success message or plot)
  // For now, just ensuring the button is clicked and no error appears immediately would be good, 
  // but the prompt strictly asks to "run the simulation".
});
