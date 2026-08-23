import { test } from '@playwright/test';
import { VideoHelper } from './video-utils';

test('record dc parametric simulation', async ({ page }) => {
  test.setTimeout(100000);
  
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with default circuit and dark mode
  await page.goto('/?theme=dark');

  // 2. Wait for app readiness
  await page.waitForTimeout(2000); 
  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });
  await helper.initMapping();

  // 3. Update R1 to [1:1:10]k
  // R1 is centered at (0, 13) based on terminal check
  const r1Pos = await helper.mapSchematicToScreen(0, 13);
  await helper.smoothMoveTo(r1Pos.x, r1Pos.y);
  await page.mouse.click(r1Pos.x, r1Pos.y);
  await page.waitForTimeout(1000);

  // Use 'Resistance' as it's the label for resistor value
  const rValueInput = page.getByLabel(/Resistance/i);
  await helper.moveMouseSmoothlyToLocator(rValueInput);
  await rValueInput.click();
  await rValueInput.fill('');
  await page.keyboard.type('[1:1:10]k', { delay: 100 });
  await page.waitForTimeout(500);

  const applyBtn = page.getByRole('button', { name: /Apply/i });
  await helper.moveMouseSmoothlyToLocator(applyBtn);
  await applyBtn.click();
  await page.waitForTimeout(1000);

  // 4. Go to Simulation Tab
  const simulateBtn = page.getByLabel('Simulate Circuit');
  await helper.moveMouseSmoothlyToLocator(simulateBtn);
  await simulateBtn.click();
  await page.waitForTimeout(1000);

  // 5. Select DC Simulation
  const dcOption = page.getByText('DC', { exact: true });
  await helper.moveMouseSmoothlyToLocator(dcOption);
  await dcOption.click();
  await page.waitForTimeout(500);

  // 6. Configure DC Parameters
  const sourceField = page.getByLabel(/Sweep Source/i);
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

  const startVal = page.getByLabel(/Start Value/i);
  await helper.moveMouseSmoothlyToLocator(startVal);
  await startVal.click();
  await startVal.fill('');
  await page.keyboard.type('0', { delay: 100 });
  await page.waitForTimeout(300);

  const stopVal = page.getByLabel(/Stop Value/i);
  await helper.moveMouseSmoothlyToLocator(stopVal);
  await stopVal.click();
  await stopVal.fill('');
  await page.keyboard.type('1.8', { delay: 100 });
  await page.waitForTimeout(300);

  const stepSize = page.getByLabel(/Step Size/i);
  await helper.moveMouseSmoothlyToLocator(stepSize);
  await stepSize.click();
  await stepSize.fill('');
  await page.keyboard.type('10m', { delay: 100 });
  await page.waitForTimeout(300);

  // 7. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 8. Wait for Plot tab to become active
  await page.getByRole('tab', { name: 'Plot' }).waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for results to actually render

  // 9. Select only 'output' in Plot Variables
  // Since it's DC, the header might be "Plot 1" or just use generic first sidebar
  const noneBtn = page.getByRole('button', { name: 'None' }).first();
  await helper.moveMouseSmoothlyToLocator(noneBtn);
  await noneBtn.click();
  await page.waitForTimeout(500);

  const outputCheckbox = page.getByText(/output/i).first();
  await helper.moveMouseSmoothlyToLocator(outputCheckbox);
  await outputCheckbox.click();
  await page.waitForTimeout(1000);

  // 10. Slide the sweep slider from left to right
  // The slider is in the BracketOperationSlider component
  const sliderThumb = page.locator('[role="slider"]');
  await helper.moveMouseSmoothlyToLocator(sliderThumb);
  
  const sliderBox = await sliderThumb.boundingBox();
  if (sliderBox) {
      // Find the track by class name in Chakra UI v3
      const track = page.locator('div[class*="slider__track"]').first();
      const trackBox = await track.boundingBox();
      if (trackBox) {
          const startX = trackBox.x + 5;
          const endX = trackBox.x + trackBox.width - 5;
          const centerY = trackBox.y + trackBox.height / 2;

          await helper.smoothMoveTo(startX, centerY);
          await page.mouse.down();
          
          // Use Playwright's native mouse move with steps for a real drag that the component reacts to.
          // The helper's visual cursor will follow automatically via its document mousemove listener.
          await page.mouse.move(endX, centerY, { steps: 60 }); 
          
          await page.mouse.up();
          
          // Sync helper's internal state
          helper.currentX = endX;
          helper.currentY = centerY;
          
          await page.waitForTimeout(1000);
      }
  }

  // Move cursor away
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(3000);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  await page.video()?.saveAs(`test-videos/${title}.webm`);
});