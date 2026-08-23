import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record manual simulation', async ({ page }) => {
  test.setTimeout(60000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with default circuit (not clean) and dark mode
  await page.goto('/?theme=dark');

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

  // 4. Select None Configuration
  const noneOption = page.getByText('None', { exact: true });
  await helper.moveMouseSmoothlyToLocator(noneOption);
  await noneOption.click();
  await page.waitForTimeout(500);

  // 5. Manually edit the netlist in the editor
  const editor = page.locator('.monaco-editor').first();
  await helper.moveMouseSmoothlyToLocator(editor);
  await editor.click();
  await page.waitForTimeout(500);

  // Navigate to the end of the file, then move up to insert before .end
  await page.keyboard.press('Control+End');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  
  // Type the manual simulation line
  await page.keyboard.type('.tran 10u 10m', { delay: 100 });
  await page.waitForTimeout(1000);

  // 6. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 7. Wait for Plot tab to render
  await page.waitForTimeout(5000);

  // Move cursor to a safe place (e.g., center of screen)
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(2000);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});
