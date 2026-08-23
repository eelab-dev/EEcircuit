import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record moving component', async ({ page }) => {
  test.setTimeout(40000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with clean slate and dark mode
  await page.goto('/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); 
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  // 3. Pre-calculate all coordinates
  const center = await helper.mapSchematicToScreen(0, 0); // Initial placement
  const pickUpPoint = await helper.mapSchematicToScreen(0, 0); // Where to click to pick up
  const midPoint1 = await helper.mapSchematicToScreen(-5, 5); // First move waypoint
  const midPoint2 = await helper.mapSchematicToScreen(5, 5); // Second move waypoint
  const finalPoint = await helper.mapSchematicToScreen(3, -4); // Final placement
  const lookAwayPoint = await helper.mapSchematicToScreen(10, 0); // Final mouse rest

  // Reset the playwright mouse and the helper's internal coordinates to (0,0)
  await page.mouse.move(0, 0);
  helper.currentX = 0;
  helper.currentY = 0;

  // 4. Place nFET at the center
  const addCompBtn = page.getByRole('button', { name: /Add Component/i });
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  const nfetItem = page.getByText('nFET', { exact: true });
  await helper.moveMouseSmoothlyToLocator(nfetItem);
  await nfetItem.click();
  await page.waitForTimeout(500);

  await helper.smoothMoveTo(center.x, center.y);
  await page.waitForTimeout(200);
  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(800);

  // Cancel move mode after placement
  const cancelMoveBtn = page.getByRole('button', { name: 'Cancel move' });
  if (await cancelMoveBtn.isVisible()) {
    await cancelMoveBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);

  // 5. Activate Move mode
  const moveBtn = page.getByRole('button', { name: 'Move (M)' });
  await helper.moveMouseSmoothlyToLocator(moveBtn);
  await moveBtn.click();
  await page.waitForTimeout(500);

  // 6. Move component and use flip/rotation options
  const actionDelay = 1200; // Adjustable delay between operations (ms)

  // Hover over the placed nFET
  await helper.smoothMoveTo(pickUpPoint.x, pickUpPoint.y);
  await page.waitForTimeout(actionDelay);

  // Click to pick it up
  await page.mouse.click(pickUpPoint.x, pickUpPoint.y);
  await page.waitForTimeout(actionDelay);

  // Drag to midpoint 1
  await helper.smoothMoveTo(midPoint1.x, midPoint1.y, 300);
  await page.waitForTimeout(actionDelay);

  // Rotate twice
  await page.keyboard.press('r');
  await page.waitForTimeout(actionDelay);
  await page.keyboard.press('r');
  await page.waitForTimeout(actionDelay);

  // Drag to midpoint 2
  await helper.smoothMoveTo(midPoint2.x, midPoint2.y, 300);
  await page.waitForTimeout(actionDelay);

  // Flip horizontally
  await page.keyboard.press('h');
  await page.waitForTimeout(actionDelay);
  
  // Flip vertically
  await page.keyboard.press('v');
  await page.waitForTimeout(actionDelay);

  // Move to final position
  await helper.smoothMoveTo(finalPoint.x, finalPoint.y, 300);
  await page.waitForTimeout(actionDelay);

  // Click to drop the component
  await page.mouse.click(finalPoint.x, finalPoint.y);
  await page.waitForTimeout(actionDelay);

  // 7. Escape move mode and look away
  await page.keyboard.press('Escape');
  await page.waitForTimeout(actionDelay);

  await helper.smoothMoveTo(lookAwayPoint.x, lookAwayPoint.y);
  await page.waitForTimeout(1500);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});
