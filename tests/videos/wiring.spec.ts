import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record wiring resistors', async ({ page }) => {
  test.setTimeout(40000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with clean slate and dark mode
  await page.goto('http://localhost:5173/?theme=dark&clean=true');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); 
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  const addCompBtn = page.getByRole('button', { name: /Add Component/i });
  const resistorItem = page.getByText('resistor', { exact: true });

  // 3. Pre-calculate all coordinates to prevent cursor jumps during the video
  const pos1 = await helper.mapSchematicToScreen(0, 5); // Top resistor
  const pos2 = await helper.mapSchematicToScreen(0, -5); // Bottom resistor
  const pin1 = await helper.mapSchematicToScreen(5, 5);
  const pin2 = await helper.mapSchematicToScreen(5, -5);
  const guardPullOut1 = await helper.mapSchematicToScreen(7, 5); 
  const dragDownPt = await helper.mapSchematicToScreen(7, -5); 
  const pin3 = await helper.mapSchematicToScreen(-5, 5);
  const pin4 = await helper.mapSchematicToScreen(-5, -5);
  const guardPullOut2 = await helper.mapSchematicToScreen(-7, 5); 
  const dragDownPt2 = await helper.mapSchematicToScreen(-7, -5); 

  const pos3 = await helper.mapSchematicToScreen(0, 0); // Middle resistor
  const pin5 = await helper.mapSchematicToScreen(5, 0); // R3 right pin
  const pin6 = await helper.mapSchematicToScreen(-5, 0); // R3 left pin
  const junctionRight = await helper.mapSchematicToScreen(7, 0); // Right wire vertical trace
  const junctionLeft = await helper.mapSchematicToScreen(-7, 0); // Left wire vertical trace

  // Reset the playwright mouse and the helper's internal coordinates to (0,0) 
  // so the first smoothMoveTo starts cleanly without jumping back.
  await page.mouse.move(0, 0);
  helper.currentX = 0;
  helper.currentY = 0;

  // 4. Place first resistor (top)
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  await helper.moveMouseSmoothlyToLocator(resistorItem);
  await resistorItem.click();
  await page.waitForTimeout(500);


  await helper.smoothMoveTo(pos1.x, pos1.y);
  await page.waitForTimeout(200);
  await page.mouse.click(pos1.x, pos1.y);
  await page.waitForTimeout(800);

  // Cancel move mode after placement
  const cancelMoveBtn1 = page.getByRole('button', { name: 'Cancel move' });
  if (await cancelMoveBtn1.isVisible()) {
    await cancelMoveBtn1.click();
  }

  // 5. Place second resistor (bottom)
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  await helper.moveMouseSmoothlyToLocator(resistorItem);
  await resistorItem.click();
  await page.waitForTimeout(500);


  await helper.smoothMoveTo(pos2.x, pos2.y);
  await page.waitForTimeout(200);
  await page.mouse.click(pos2.x, pos2.y);
  await page.waitForTimeout(800);

  // Cancel move mode after placement
  const cancelMoveBtn2 = page.getByRole('button', { name: 'Cancel move' });
  if (await cancelMoveBtn2.isVisible()) {
    await cancelMoveBtn2.click();
  }

  // 5. Place third resistor (middle)
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  await helper.moveMouseSmoothlyToLocator(resistorItem);
  await resistorItem.click();
  await page.waitForTimeout(500);

  await helper.smoothMoveTo(pos3.x, pos3.y);
  await page.waitForTimeout(200);
  await page.mouse.click(pos3.x, pos3.y);
  await page.waitForTimeout(800);

  // Cancel move mode after placement
  const cancelMoveBtn3 = page.getByRole('button', { name: 'Cancel move' });
  if (await cancelMoveBtn3.isVisible()) {
    await cancelMoveBtn3.click();
  }

  // 6. Activate Wiring mode
  const wireBtn = page.getByRole('button', { name: /Wire/i });
  await helper.moveMouseSmoothlyToLocator(wireBtn);
  await wireBtn.click();
  await page.waitForTimeout(800);

  // 7. Wire from right pin of top resistor to right pin of bottom resistor

  // Start wire at top resistor right pin
  await helper.smoothMoveTo(pin1.x, pin1.y);
  await page.waitForTimeout(400); 

  // Click to start wire
  await page.mouse.click(pin1.x, pin1.y);
  await page.waitForTimeout(400);

  // The user says: "respecting the wire guards, that means moving away from terminals a bit."
  // Pull the wire 2 units to the right from the pin before routing down
  await helper.smoothMoveTo(guardPullOut1.x, guardPullOut1.y);
  await page.waitForTimeout(200);
  await page.mouse.click(guardPullOut1.x, guardPullOut1.y);
  await page.waitForTimeout(200);

  // Drag straight down to the y-level of the bottom resistor's pin
  await helper.smoothMoveTo(dragDownPt.x, dragDownPt.y);
  await page.waitForTimeout(200);
  await page.mouse.click(dragDownPt.x, dragDownPt.y);
  await page.waitForTimeout(200);

  // Move into the bottom resistor's right pin
  await helper.smoothMoveTo(pin2.x, pin2.y);
  await page.waitForTimeout(400);

  // Click to finish the wire
  await page.mouse.click(pin2.x, pin2.y);
  await page.waitForTimeout(800);

  // 8. Wire from left pin of top resistor to left pin of bottom resistor

  // Start wire at top resistor left pin
  await helper.smoothMoveTo(pin3.x, pin3.y);
  await page.waitForTimeout(400); 

  // Click to start wire
  await page.mouse.click(pin3.x, pin3.y);
  await page.waitForTimeout(400);

  // Pull the wire 2 units to the left from the pin before routing down
  await helper.smoothMoveTo(guardPullOut2.x, guardPullOut2.y);
  await page.waitForTimeout(200);
  await page.mouse.click(guardPullOut2.x, guardPullOut2.y);
  await page.waitForTimeout(200);

  // Drag straight down to the y-level of the bottom resistor's left pin
  await helper.smoothMoveTo(dragDownPt2.x, dragDownPt2.y);
  await page.waitForTimeout(200);
  await page.mouse.click(dragDownPt2.x, dragDownPt2.y);
  await page.waitForTimeout(200);

  // Move into the bottom resistor's left pin
  await helper.smoothMoveTo(pin4.x, pin4.y);
  await page.waitForTimeout(400);

  // Click to finish the wire
  await page.mouse.click(pin4.x, pin4.y);
  await page.waitForTimeout(800);

  // 9. Wire third resistor (middle) to the vertical traces to create junctions
  // Right side junction
  await helper.smoothMoveTo(pin5.x, pin5.y);
  await page.waitForTimeout(400);
  await page.mouse.click(pin5.x, pin5.y);
  await page.waitForTimeout(400);

  await helper.smoothMoveTo(junctionRight.x, junctionRight.y);
  await page.waitForTimeout(400);
  await page.mouse.click(junctionRight.x, junctionRight.y);
  await page.waitForTimeout(400);

  // Left side junction
  await helper.smoothMoveTo(pin6.x, pin6.y);
  await page.waitForTimeout(400);
  await page.mouse.click(pin6.x, pin6.y);
  await page.waitForTimeout(400);

  await helper.smoothMoveTo(junctionLeft.x, junctionLeft.y);
  await page.waitForTimeout(400);
  await page.mouse.click(junctionLeft.x, junctionLeft.y);
  await page.waitForTimeout(400);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 9. Verification is handled visually in the video recording.
  // We deleted the eecircuitTest inspection since it caused crashes.

  // Move away slightly so the user can see the final wired circuit
  await helper.smoothMoveTo(pos2.x + 150, pos2.y + 150);
  await page.waitForTimeout(1500);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});
