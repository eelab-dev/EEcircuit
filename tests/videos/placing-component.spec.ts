import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record component placement', async ({ page }) => {
  test.setTimeout(30000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();

  // 1. Open the app with clean slate and dark mode
  await page.goto('http://localhost:5173/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); // Initial load wait
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });

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

  // Save the video to the specific folder
  const video = page.video();
  
  // Closing the page forces the video stream to flush immediately,
  // reducing save time from ~20s to ~3s.
  await page.close();

  if (video) {
    await video.saveAs('videos/placing_component.webm');
  }
});
