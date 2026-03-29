import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record transient simulation', async ({ page }) => {
  test.setTimeout(60000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with default circuit (not clean) and dark mode
  await page.goto('http://localhost:5173/?theme=dark');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); 
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  // 3. Click Go to Simulation button
  const simulateBtn = page.getByLabel('Simulate Circuit');
  await helper.moveMouseSmoothlyToLocator(simulateBtn);
  await simulateBtn.click();
  
  // Wait for Simulate tab content
  await page.waitForTimeout(1000);

  // 4. Select Transient Simulation
  const transientOption = page.getByText('Transient', { exact: true });
  await helper.moveMouseSmoothlyToLocator(transientOption);
  await transientOption.click();
  await page.waitForTimeout(500);

  // 5. Fill Transient Parameters
  
  // Stop Time: 10m
  const stopTimeField = page.getByLabel(/Stop Time/i);
  await helper.moveMouseSmoothlyToLocator(stopTimeField);
  await stopTimeField.click();
  await stopTimeField.fill('');
  await page.keyboard.type('10m', { delay: 100 });
  await page.waitForTimeout(500);

  // Time Step: 1u
  const timeStepField = page.getByLabel(/Time Step/i);
  await helper.moveMouseSmoothlyToLocator(timeStepField);
  await timeStepField.click();
  await timeStepField.fill('');
  await page.keyboard.type('1u', { delay: 100 });
  await page.waitForTimeout(500);

  // 6. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 7. Wait for Plot tab to render
  await page.waitForTimeout(5000);

  // 8. Interact with PlotSidebar to choose only 'vin' and 'vout'
  // Transient is single canvas usually
  const noneBtn = page.getByRole('button', { name: 'None' }).first();
  await helper.moveMouseSmoothlyToLocator(noneBtn);
  await noneBtn.click();
  await page.waitForTimeout(1000);

  // Check for 'input' (vin) and 'output' (vout)
  // Use regex to be flexible (e.g. v(input) or input)
  const vinCheckbox = page.getByText(/input/i).first();
  await helper.moveMouseSmoothlyToLocator(vinCheckbox);
  await vinCheckbox.click();
  await page.waitForTimeout(500);

  const voutCheckbox = page.getByText(/output/i).first();
  await helper.moveMouseSmoothlyToLocator(voutCheckbox);
  await voutCheckbox.click();
  await page.waitForTimeout(500);

  // Move cursor to a safe place (e.g., center of screen)
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(2000);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});