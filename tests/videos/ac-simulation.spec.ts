import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record ac simulation', async ({ page }) => {
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

  const addCompBtn = page.getByRole('button', { name: /Add Component/i });
  const capacitorItem = page.getByText('capacitor', { exact: true });
  const gndItem = page.getByText('GND', { exact: true });
  const wireBtn = page.getByRole('button', { name: /Wire/i });

  // 3. Place Capacitor at (12, 0)
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  await helper.moveMouseSmoothlyToLocator(capacitorItem);
  await capacitorItem.click();
  await page.waitForTimeout(500);

  const capPos = await helper.mapSchematicToScreen(12, 0);
  await helper.smoothMoveTo(capPos.x, capPos.y);
  await page.mouse.click(capPos.x, capPos.y);
  await page.waitForTimeout(800);

  // Cancel move mode
  const cancelMoveBtn = page.getByRole('button', { name: 'Cancel move' });
  if (await cancelMoveBtn.isVisible()) {
    await cancelMoveBtn.click();
  }
  await page.waitForTimeout(500);

  // 4. Configure Capacitor to 1nF
  await helper.smoothMoveTo(capPos.x, capPos.y);
  await page.mouse.click(capPos.x, capPos.y);
  await page.waitForTimeout(1000);

  const valueInput = page.getByLabel(/Capacitance/i);
  await helper.moveMouseSmoothlyToLocator(valueInput);
  await valueInput.click();
  await valueInput.fill('');
  await page.keyboard.type('1nF', { delay: 100 });
  await page.waitForTimeout(500);

  const applyBtn = page.getByRole('button', { name: /Apply/i });
  await helper.moveMouseSmoothlyToLocator(applyBtn);
  await applyBtn.click();
  await page.waitForTimeout(1000);

  // 5. Add GND at (12, -10)
  await helper.moveMouseSmoothlyToLocator(addCompBtn);
  await addCompBtn.click();
  await page.waitForTimeout(500);

  await helper.moveMouseSmoothlyToLocator(gndItem);
  await gndItem.click();
  await page.waitForTimeout(500);

  const gndPos = await helper.mapSchematicToScreen(12, -10);
  await helper.smoothMoveTo(gndPos.x, gndPos.y);
  await page.mouse.click(gndPos.x, gndPos.y);
  await page.waitForTimeout(800);

  if (await cancelMoveBtn.isVisible()) {
    await cancelMoveBtn.click();
  }
  await page.waitForTimeout(500);

  // 6. Wire Capacitor
  await helper.moveMouseSmoothlyToLocator(wireBtn);
  await wireBtn.click();
  await page.waitForTimeout(500);

  // Wire from (12, 2) [Cap top pin] to (0, 7) [output net junction]
  const capTopPin = await helper.mapSchematicToScreen(12, 2);
  const outJunction = await helper.mapSchematicToScreen(0, 7);
  const corner1 = await helper.mapSchematicToScreen(12, 7);

  await helper.smoothMoveTo(capTopPin.x, capTopPin.y);
  await page.mouse.click(capTopPin.x, capTopPin.y);
  await page.waitForTimeout(400);

  await helper.smoothMoveTo(corner1.x, corner1.y);
  await page.mouse.click(corner1.x, corner1.y);
  await page.waitForTimeout(400);

  await helper.smoothMoveTo(outJunction.x, outJunction.y);
  await page.mouse.click(outJunction.x, outJunction.y);
  await page.waitForTimeout(600);

  // Wire from (12, -2) [Cap bottom pin] to (12, -10) [GND pin]
  const capBottomPin = await helper.mapSchematicToScreen(12, -2);
  const gndPin = await helper.mapSchematicToScreen(12, -10);

  await helper.smoothMoveTo(capBottomPin.x, capBottomPin.y);
  await page.mouse.click(capBottomPin.x, capBottomPin.y);
  await page.waitForTimeout(400);

  await helper.smoothMoveTo(gndPin.x, gndPin.y);
  await page.mouse.click(gndPin.x, gndPin.y);
  await page.waitForTimeout(600);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // 7. Click Go to Simulation
  const simulateBtn = page.getByLabel('Simulate Circuit');
  await helper.moveMouseSmoothlyToLocator(simulateBtn);
  await simulateBtn.click();
  await page.waitForTimeout(1000);

  // 8. Select AC Simulation
  const acOption = page.getByText('AC', { exact: true });
  await helper.moveMouseSmoothlyToLocator(acOption);
  await acOption.click();
  await page.waitForTimeout(500);

  // 9. Configure AC Parameters
  
  // Source: Select 'vin'
  const sourceField = page.getByLabel(/^Source$/);
  await helper.moveMouseSmoothlyToLocator(sourceField);
  const sourceTagName = await sourceField.evaluate(el => el.tagName.toLowerCase());
  if (sourceTagName === 'select') {
    await sourceField.selectOption({ label: 'vin' });
  } else {
    await sourceField.click();
    await sourceField.fill('');
    await page.keyboard.type('vin', { delay: 100 });
  }
  await page.waitForTimeout(300);

  // Sweep Type: Decade
  const sweepTypeField = page.getByLabel(/Sweep Type/i);
  await helper.moveMouseSmoothlyToLocator(sweepTypeField);
  await sweepTypeField.selectOption('dec');
  await page.waitForTimeout(300);

  const startFreq = page.getByLabel(/Start Frequency/i);
  await helper.moveMouseSmoothlyToLocator(startFreq);
  await startFreq.click();
  await startFreq.fill('');
  await page.keyboard.type('1', { delay: 100 });
  await page.waitForTimeout(300);

  const stopFreq = page.getByLabel(/Stop Frequency/i);
  await helper.moveMouseSmoothlyToLocator(stopFreq);
  await stopFreq.click();
  await stopFreq.fill('');
  await page.keyboard.type('1G', { delay: 100 });
  await page.waitForTimeout(300);

  const stepsNumber = page.getByLabel(/Steps Number/i);
  await helper.moveMouseSmoothlyToLocator(stepsNumber);
  await stepsNumber.click();
  await stepsNumber.fill('');
  await page.keyboard.type('10', { delay: 100 });
  await page.waitForTimeout(300);

  // 10. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 11. Wait for Plot tab
  await page.waitForTimeout(4000);

  // 12. Interact with PlotSidebar to choose only 'output'
  // Plot 1 (Magnitude) - Deselect All then Select 'output'
  const canvas1NoneBtn = page.getByRole('button', { name: 'None' }).first();
  await helper.moveMouseSmoothlyToLocator(canvas1NoneBtn);
  await canvas1NoneBtn.click();
  await page.waitForTimeout(500);

  const magOutput = page.getByText(/output/i).first();
  await helper.moveMouseSmoothlyToLocator(magOutput);
  await magOutput.click();
  await page.waitForTimeout(500);

  // Plot 2 (Phase) - Deselect All then Select 'output [phase]'
  const canvas2NoneBtn = page.getByRole('button', { name: 'None' }).last();
  await helper.moveMouseSmoothlyToLocator(canvas2NoneBtn);
  await canvas2NoneBtn.click();
  await page.waitForTimeout(500);

  const phaseOutput = page.getByText(/output/i).last();
  await helper.moveMouseSmoothlyToLocator(phaseOutput);
  await phaseOutput.click();
  await page.waitForTimeout(500);

  // Move cursor away
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(2000);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});