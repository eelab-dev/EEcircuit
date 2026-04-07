import { test, expect } from '@playwright/test';
import { VideoHelper } from './video-utils';

test.setTimeout(120000); // Allow enough time for the video recording

// Global variables to hold the dynamically discovered coordinates
let inputTargetSch = { x: -12, y: 0 }; // Safe fallbacks
let outputTargetSch = { x: 0, y: 6 };

test.beforeAll(async ({ browser }) => {
  console.log('Starting pre-scan in a separate session to locate wire coordinates...');
  // Create a separate context for scanning so it doesn't get recorded in the main test's video
  const context = await browser.newContext({ recordVideo: undefined });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/?theme=dark');
  await page.waitForTimeout(500); 
  const schematicCanvas = page.locator('#schematic-canvas');
  await schematicCanvas.waitFor({ state: 'attached' });
  
  // Enter fullscreen for accurate coordinate mapping
  await page.keyboard.press('f');
  await page.waitForTimeout(1000);
  
  const helper = new VideoHelper(page);
  await helper.initMapping();
  
  let inSch = null;
  let outSch = null;
  
  // Scan a small 5x5 grid around the expected locations to find the exact wire hitboxes dynamically
  const scanTargets = [
    // Look near input label (approx -12, 0)
    ...Array.from({length: 25}, (_, i) => ({x: -14 + (i % 5), y: -2 + Math.floor(i/5)})),
    // Look near output label (approx 0, 6)
    ...Array.from({length: 25}, (_, i) => ({x: -2 + (i % 5), y: 4 + Math.floor(i/5)}))
  ];

  for (const {x, y} of scanTargets) {
    if (inSch && outSch) break;
    
    const p = await helper.mapSchematicToScreen(x, y);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(20); 
    
    const btns = await page.locator('button').filter({ hasText: /.* - \d+/ }).all();
    for (const btn of btns) {
      if (await btn.isVisible()) {
          const text = await btn.innerText();
          const isWire = await btn.locator('svg.lucide-cable, .lucide-cable').count() > 0;
          if (isWire) {
              if (text.includes('input') && !inSch) {
                  inSch = { x, y };
                  console.log(`Pre-scan found input wire at SCH(${x}, ${y})`);
              } else if (text.includes('output') && !outSch) {
                  outSch = { x, y };
                  console.log(`Pre-scan found output wire at SCH(${x}, ${y})`);
              }
          }
      }
    }
  }
  
  if (inSch) inputTargetSch = inSch;
  if (outSch) outputTargetSch = outSch;
  
  await context.close();
  console.log('Pre-scan complete.');
});

test('record to be plotted video', async ({ page }) => {
  const helper = new VideoHelper(page);
  await helper.initCursor();
  await helper.initKeyboardDisplay();

  // 1. Open the app with default circuit and dark mode
  await page.goto('http://localhost:5173/?theme=dark');

  // 2. Wait for app readiness
  await page.waitForTimeout(500); 
  const schematicCanvas = page.locator('#schematic-canvas');
  await schematicCanvas.waitFor({ state: 'attached' });
  await expect(schematicCanvas).toBeVisible();

  // Press 'f' for fullscreen before doing anything else
  await page.keyboard.press('f');
  await page.waitForTimeout(1000); // Give canvas time to completely render after fullscreen resize

  // Set the initial mouse position to the center of the screen so the first cursor movement doesn't crawl slowly from (0,0)
  const size = page.viewportSize();
  if (size) {
      helper.currentX = size.width / 2;
      helper.currentY = size.height / 2;
  }

  await helper.initMapping();

  // Map the dynamically found coordinates to screen space
  const inTarget = await helper.mapSchematicToScreen(inputTargetSch.x, inputTargetSch.y);
  const outTarget = await helper.mapSchematicToScreen(outputTargetSch.x, outputTargetSch.y);

  // 3. Click Go to Simulation button
  const simulateBtn = page.getByLabel('Simulate Circuit');
  await helper.moveMouseSmoothlyToLocator(simulateBtn);
  await simulateBtn.click();
  
  // Wait for Simulate tab content
  await page.waitForTimeout(300);

  // 4. Click on "To Be Plotted" button
  const toBePlottedBtn = page.getByRole('button', { name: /To Be Plotted/i });
  await helper.moveMouseSmoothlyToLocator(toBePlottedBtn);
  await toBePlottedBtn.click();
  
  // Wait for transition back to schematic
  await expect(schematicCanvas).toBeVisible();
  await page.waitForTimeout(300);

  // Click the precise wire coordinates smoothly
  await helper.smoothMoveTo(inTarget.x, inTarget.y);
  await page.waitForTimeout(100);
  await page.mouse.click(inTarget.x, inTarget.y);
  await page.waitForTimeout(300);

  await helper.smoothMoveTo(outTarget.x, outTarget.y);
  await page.waitForTimeout(100);
  await page.mouse.click(outTarget.x, outTarget.y);
  await page.waitForTimeout(300);

  // Exit "To be plotted" mode by pressing Escape
  await page.keyboard.press('Escape');
  // Wait for transition back to Simulate tab
  const simConfigHeader = page.getByText("Simulation Configuration", { exact: false }).first();
  await expect(simConfigHeader).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(300);

  // 5. Select Transient Simulation
  const transientOption = page.getByText('Transient', { exact: true });
  await helper.moveMouseSmoothlyToLocator(transientOption);
  await transientOption.click();
  await page.waitForTimeout(100);

  // 6. Fill Transient Parameters
  // Stop Time: 10m
  const stopTimeField = page.getByLabel(/Stop Time/i);
  await helper.moveMouseSmoothlyToLocator(stopTimeField);
  await stopTimeField.click();
  await stopTimeField.fill('');
  await page.keyboard.type('10m', { delay: 50 });
  await page.waitForTimeout(100);

  // Time Step: 1u
  const timeStepField = page.getByLabel(/Time Step/i);
  await helper.moveMouseSmoothlyToLocator(timeStepField);
  await timeStepField.click();
  await timeStepField.fill('');
  await page.keyboard.type('1u', { delay: 50 });
  await page.waitForTimeout(100);

  // 7. Run Simulation
  const runBtn = page.getByRole('button', { name: 'Run Simulation' });
  await helper.moveMouseSmoothlyToLocator(runBtn);
  await runBtn.click();

  // 8. Wait for Plot tab to render
  await page.waitForTimeout(2000);

  // 9. Show and verify the selected variables in the Plot Sidebar
  // The sidebar is usually pinned on desktop by default
  const sidebar = page.locator('aside').filter({ hasText: /Variables/i });
  if (await sidebar.isVisible()) {
    // Move mouse to the sidebar to draw attention to it
    const sidebarBox = await sidebar.boundingBox();
    if (sidebarBox) {
      await helper.smoothMoveTo(sidebarBox.x + 50, sidebarBox.y + 100);
      await page.waitForTimeout(300);
      
      // We expect V(input) and V(output) because we clicked on the wires
      const inputVar = page.getByText('v(input)', { exact: true }).first();
      if (await inputVar.isVisible()) {
        await helper.moveMouseSmoothlyToLocator(inputVar);
        await page.waitForTimeout(100);
      }
      
      const outputVar = page.getByText('v(output)', { exact: true }).first();
      if (await outputVar.isVisible()) {
        await helper.moveMouseSmoothlyToLocator(outputVar);
        await page.waitForTimeout(100);
      }
    }
  }

  // Verification step: Instant DOM evaluate to prevent the video stream from freezing.
  const checkedVariables = await page.evaluate(() => {
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    return checkboxes.filter(cb => cb.checked).map(cb => {
      const parent = cb.closest('label');
      return parent ? (parent as HTMLElement).innerText.trim() : '';
    });
  });
  
  expect(checkedVariables).toHaveLength(2);
  expect(checkedVariables).toContain('v(input)');
  expect(checkedVariables).toContain('v(output)');

  // Move cursor to a safe place
  await helper.smoothMoveTo(500, 300);
  await page.waitForTimeout(500);
});

test.afterEach(async ({ page }, testInfo) => {
  // We must close the page so Playwright finalizes the internal WebM buffer
  await page.close();
  const title = testInfo.title.replace(/[\s/\\:]+/g, '-').toLowerCase();
  
  const video = page.video();
  if (video) {
    // Calling path() will block until the WebM stream is cleanly closed by the browser context
    await video.path();
    await video.saveAs(`test-videos/${title}.webm`);
  }
});