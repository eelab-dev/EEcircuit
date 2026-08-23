import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record component placement', async ({ page }) => {
  test.setTimeout(30000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with clean slate and dark mode
  await page.goto('/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); // Initial load wait
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  // 3. Move to and click Add Component menu
  const addCompBtn = page.getByRole('button', { name: /Add Component/i });
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(800);

  // 4. Move to and click Resistor
  const resistorItem = page.getByText('resistor', { exact: true });
  await helper.moveMouseSmoothlyToLocator(resistorItem);
  await resistorItem.click();
  await page.waitForTimeout(800);

  // 5. Move to canvas center and Place it
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
      // Move to center
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await helper.smoothMoveTo(targetX, targetY);
      
      await page.waitForTimeout(200); // Pause before click
      await page.mouse.click(targetX, targetY);
      
      // Move away slightly to show the component clearly
      await helper.smoothMoveTo(targetX + 150, targetY + 150);
  }
  
  // 6. Show the placed component for a moment
  await page.waitForTimeout(1000); 

  // Wait a bit to ensure the final frame is captured before Playwright auto-closes
  await page.waitForTimeout(500);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});
