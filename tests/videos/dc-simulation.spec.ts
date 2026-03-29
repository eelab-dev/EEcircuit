import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record dc simulation', async ({ page }) => {
  test.setTimeout(40000);
  
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

  // 4. Select DC Simulation
  const dcOption = page.getByText('DC', { exact: true });
  await helper.moveMouseSmoothlyToLocator(dcOption);
  await dcOption.click();
  await page.waitForTimeout(500);

  // 5. Fill DC Parameters
  
  // Sweep Source
  const sourceField = page.getByLabel('Sweep Source');
  await helper.moveMouseSmoothlyToLocator(sourceField);
  
  const tagName = await sourceField.evaluate(el => el.tagName.toLowerCase());
  if (tagName === 'select') {
    // If select, try to select "vin", fallback to index 1
    const options = await sourceField.innerText();
    if (options.includes('vin')) {
      await sourceField.selectOption({ label: 'vin' });
    } else {
      await sourceField.selectOption({ index: 1 });
    }
  } else {
    await sourceField.click();
    await sourceField.fill('');
    await page.keyboard.type('vin', { delay: 100 });
  }
  await page.waitForTimeout(500);

  // Start Value: 0
  const startField = page.getByLabel('Start Value');
  await helper.moveMouseSmoothlyToLocator(startField);
  await startField.click();
  await startField.fill('');
  await page.keyboard.type('0', { delay: 100 });
  await page.waitForTimeout(500);

  // Stop Value: 1.8
  const stopField = page.getByLabel('Stop Value');
  await helper.moveMouseSmoothlyToLocator(stopField);
  await stopField.click();
  await stopField.fill('');
  await page.keyboard.type('1.8', { delay: 100 });
  await page.waitForTimeout(500);

  // Step Size: 10m
  const stepField = page.getByLabel('Step Size');
  await helper.moveMouseSmoothlyToLocator(stepField);
  await stepField.click();
  await stepField.fill('');
  await page.keyboard.type('10m', { delay: 100 });
  await page.waitForTimeout(500);

  // 6. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 7. Wait for Plot tab to render
  await page.waitForTimeout(2000);

  // Move cursor to a safe place (e.g., center of screen)
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(1500);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});