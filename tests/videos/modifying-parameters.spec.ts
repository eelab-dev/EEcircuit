import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record modifying transistor parameters', async ({ page }) => {
  test.setTimeout(40000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();

  // 1. Open the app with clean slate and dark mode
  await page.goto('http://localhost:5173/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); // Initial load wait
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  // 3. Load Demo Circuit
  const newSchematicBtn = page.getByLabel('New Schematic').first();
  await newSchematicBtn.click();
  await page.waitForTimeout(500);
  const loadDemoBtn = page.getByRole('button', { name: 'Load Demo' });
  await loadDemoBtn.click();
  await page.waitForTimeout(1000);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  
  let targetX = 0;
  let targetY = 0;

  if (box) {
      // The FET (M1) is exactly at schematic origin (0, 0).
      // User says middle is exactly at schematic coordinates x: -2, y: 0.
      
      const targetSchX = -2;
      const targetSchY = 0;
      
      const coords = await helper.mapSchematicToScreen(targetSchX, targetSchY);
      targetX = coords.x;
      targetY = coords.y;
      
      // Move mouse to the center visibly and smoothly
      await helper.smoothMoveTo(targetX, targetY);
      await page.waitForTimeout(500);
      
      // Click to open properties
      await page.mouse.click(targetX, targetY);
      await page.waitForTimeout(800);
  }
  
  // 5. Modify Width
  const wInput = page.getByLabel('Width');
  await helper.moveMouseSmoothlyToLocator(wInput);
  await wInput.click();
  await wInput.fill('');
  await wInput.fill('10u');
  await page.waitForTimeout(500);

  // 6. Modify Length
  const lInput = page.getByLabel('Length');
  await helper.moveMouseSmoothlyToLocator(lInput);
  await lInput.click();
  await lInput.fill('');
  await lInput.fill('5u');
  await page.waitForTimeout(500);

  // 7. Scroll down to Apply and Click it
  const applyBtn = page.getByRole('button', { name: /Apply/i });
  await helper.moveMouseSmoothlyToLocator(applyBtn);
  await applyBtn.click();

  // Show the updated properties for a moment
  await page.waitForTimeout(1500);

  // Move away slightly to show the component clearly
  await helper.smoothMoveTo(targetX + 150, targetY + 150);
  await page.waitForTimeout(1500);
  
  // Wait a bit to ensure the final frame is captured before Playwright auto-closes
  await page.waitForTimeout(500);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});
