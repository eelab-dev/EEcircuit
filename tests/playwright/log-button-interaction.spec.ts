import { test, expect } from './fixtures';

test('Log button interaction', async ({ page }, testInfo) => {
  // Enable console logging with filter
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('EEcircuitApp') || text.includes('Step:') || text.includes('Simulation Result') || text.includes('DEBUG')) {
      console.log(`BROWSER LOG: ${text}`);
    }
  });

  // 1. Open the app (Use correct port 5173)
  await page.goto('/');

  // 2. Load Demo Circuit (Schematic Tab)
  console.log('Step: Load Demo Circuit');
  await page.getByLabel('New Schematic').first().click();
  await page.getByRole('button', { name: 'Load Demo' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  console.log('Demo Loaded');

  // 3. Click Simulate Button 
  console.log('Step: Go to Simulate Tab');
  // Shift intentionally exercises the existing "proceed despite schematic
  // validation" path so this UI test is independent of upstream validation.
  await page.getByRole('button', { name: 'Simulate Circuit' }).click({ modifiers: ['Shift'] });
  
  // Verify we are on Simulate tab 
  await expect(page.getByRole('group', { name: 'Simulation Configuration' })).toBeVisible({ timeout: 10000 });
  console.log('Transited to Simulate Tab');

  // 4. Select Transient (if not already)
  // Demo circuit defaults to Transient usually, but let's ensure.
  console.log('Step: Select Transient');
  const tranLabel = page.getByText('Transient', { exact: true });
  // If it's a radio/tab trigger, clicking it works.
  await tranLabel.click();
  
  // Verify Transient fields appear (e.g. Stop Time)
  await expect(page.getByLabel('Stop Time')).toBeVisible();
  
  // Explicitly config Transient to ensure valid simulation
  await page.getByLabel('Stop Time').fill('10m');
  await page.getByLabel('Time Step').fill('100u');
  
  console.log('Transient Selected & Configured');

  // 5. Run Simulation
  console.log('Step: Run Simulation');
  await page.getByRole('button', { name: /Run Simulation|Run/i }).click();

  // 6. Verify Plot Tab
  console.log('Step: Verify Plot Tab Transition');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  
  // Wait for sidebar
  await expect(page.getByText('Plot Variables')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.plot-webgl').first()).toHaveCSS('cursor', 'crosshair');
  await expect(page.locator('.plot-interaction-hint').first()).toContainText(/Drag to zoom|Pinch to zoom/);
  await page.screenshot({ path: testInfo.outputPath('plot-desktop.png') });
  console.log('Transited to Plot Tab');

  // Exercise the progress presentation independently of worker timing so the
  // success/failure totals and per-thread status remain stable to assert.
  await page.evaluate(async () => {
    type TestState = {
      setBracketOperation: (operation?: { start: number; step: number; stop: number; unit?: string; originalText: string; position: number }) => void;
      initializeThreads: (threads: number, simulations: number) => void;
      updateThreadProgress: (thread: number, progress: { isRunning: boolean; completedSimulations: number }) => void;
      updateParallelSimulationProgress: (progress: { total: number; completed: number; successful: number; failed: number }) => void;
      setParallelSimulationRunning: (running: boolean) => void;
      resetParallelSimulation: () => void;
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    appState.setBracketOperation({ start: 1, step: 1, stop: 4, unit: "k", originalText: "[1:1:4]k", position: 0 });
    appState.initializeThreads(2, 4);
    appState.updateThreadProgress(0, { isRunning: true, completedSimulations: 2 });
    appState.updateParallelSimulationProgress({ total: 4, completed: 3, successful: 2, failed: 1 });
    appState.setParallelSimulationRunning(true);
  });
  const progress = page.getByLabel('Parallel simulation progress');
  await expect(progress).toContainText('3/4');
  await expect(progress).toContainText('2 successful');
  await expect(progress).toContainText('1 failed');
  await page.evaluate(async () => {
    type TestState = { resetParallelSimulation: () => void };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    (await loadState()).appState.resetParallelSimulation();
  });

  // 7. Test Log Buttons
  console.log('Step: Test Log X Button');
  
  // "Log X" button
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  await expect(logXBtn).toBeVisible();
  
  // Initial state should be false for Transient
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'false');
  
  // Click to toggle ON
  await logXBtn.click();
  // Verify pressed state
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'true');
  console.log('Log X Toggled ON');
  
  // Click to toggle OFF
  await logXBtn.click();
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'false');
  console.log('Log X Toggled OFF');

  // Test Log Y Button (Single Canvas)
  console.log('Step: Test Log Y Button'); 
  const logYBtn = page.getByRole('button', { name: 'Log Y', exact: true }); 
  
  if (await logYBtn.isVisible()) {
      await expect(logYBtn).toHaveAttribute('aria-pressed', 'false');
      await logYBtn.click();
      await expect(logYBtn).toHaveAttribute('aria-pressed', 'true');
      console.log('Log Y Toggled ON');
  } else {
      console.log('Log Y button not visible (might be dual mode?)');
  }
  
  // Test Single/Dual Canvas Toggle
  console.log('Step: Test Single/Dual Toggle');
  
  const singleBtn = page.getByRole('button', { name: 'Single' });
  const dualBtn = page.getByRole('button', { name: 'Dual' });
  
  // Initially we should be in Single mode (Transient default)
  // Single button should be solid/active? Implementation uses variant="solid" vs "outline"
  // But Chakra buttons don't always use aria-pressed for variants.
  // We can check if `data-active` or simply check functional change.
  // The layout changes: 
  // Single -> One PlotCanvas
  // Dual -> Two PlotCanvas instances or "Plot 1" / "Plot 2" headers
  
  // Switch to Dual
  await dualBtn.click();
  console.log('Switched to Dual');
  
  // Verify dual mode elements
  await expect(page.getByText('Plot 1').first()).toBeVisible();
  await expect(page.getByText('Plot 2').first()).toBeVisible();
  
  // Verify Log buttons for dual mode appear (Log Y1, Log Y2)
  const logY1Btn = page.getByRole('button', { name: 'Log Y1' });
  const logY2Btn = page.getByRole('button', { name: 'Log Y2' });
  
  await expect(logY1Btn).toBeVisible();
  await expect(logY2Btn).toBeVisible();
  
  // Test Log Y1
  await expect(logY1Btn).toHaveAttribute('aria-pressed', 'false');
  await logY1Btn.click();
  await expect(logY1Btn).toHaveAttribute('aria-pressed', 'true');
  console.log('Log Y1 Toggled ON');
  await logY1Btn.click(); // Toggle back off
  
  // Test Log Y2
  await expect(logY2Btn).toHaveAttribute('aria-pressed', 'false');
  await logY2Btn.click();
  await expect(logY2Btn).toHaveAttribute('aria-pressed', 'true');
  console.log('Log Y2 Toggled ON');
  await logY2Btn.click(); // Toggle back off

  // Cursor position is shared by both canvases, while snap mode remains
  // independently controllable for each plot.
  const cursorToggle = page.getByRole('button', { name: 'Toggle cursor', exact: true });
  await cursorToggle.click();
  await expect(cursorToggle).toHaveAttribute('aria-pressed', 'true');
  const surfaces = page.locator('.plot-surface');
  const firstSurface = surfaces.nth(0);
  const firstBox = await firstSurface.boundingBox();
  if (!firstBox) throw new Error('Plot surface has no bounding box');
  await page.mouse.move(firstBox.x + firstBox.width * 0.55, firstBox.y + firstBox.height * 0.5);
  await expect(page.locator('.crosshair-v')).toHaveCount(2);
  const coordinatePanel = page.locator('.crosshair-label').first();
  const coordinateBox = await coordinatePanel.boundingBox();
  const snapControlBox = await page.getByRole('button', { name: 'Toggle cursor snapping' }).first().boundingBox();
  if (!coordinateBox || !snapControlBox) throw new Error('Cursor controls have no layout bounds');
  expect(coordinateBox.x + coordinateBox.width).toBeLessThan(snapControlBox.x);
  await expect(coordinatePanel).toHaveCSS('font-size', '14px');
  const cursorPositions = await page.locator('.crosshair-v').evaluateAll((lines) => lines.map((line) => line.getAttribute('data-cursor-x')));
  expect(cursorPositions[0]).toBe(cursorPositions[1]);
  const snapButtons = page.getByRole('button', { name: 'Toggle cursor snapping' });
  await expect(snapButtons).toHaveCount(2);
  await expect(snapButtons.first().locator('svg')).toHaveCount(1);
  await snapButtons.first().click();
  await expect(snapButtons.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(snapButtons.nth(1)).toHaveAttribute('aria-pressed', 'false');
  const snapMarker = page.locator('.plot-surface').first().locator('[data-snap-marker]');
  await page.mouse.move(firstBox.x + firstBox.width * 0.3, firstBox.y + firstBox.height * 0.45);
  await expect(snapMarker).toBeVisible();
  await expect(snapMarker).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(coordinatePanel).toContainText(/X: .*(m|μ|n|p|f|k|M|G|T|0), Y: /);
  const leftSnapX = Number(await snapMarker.getAttribute('data-snap-x'));
  await page.mouse.move(firstBox.x + firstBox.width * 0.7, firstBox.y + firstBox.height * 0.45);
  await expect.poll(async () => Number(await snapMarker.getAttribute('data-snap-x'))).toBeGreaterThan(60);
  const rightSnapX = Number(await snapMarker.getAttribute('data-snap-x'));
  expect(leftSnapX).toBeGreaterThan(20);
  expect(leftSnapX).toBeLessThan(40);
  expect(rightSnapX).toBeLessThan(80);
  expect(rightSnapX - leftSnapX).toBeGreaterThan(30);

  // Log axes use logarithmic coordinates internally, but snapping and the
  // readout must remain in linear engineering units for the user.
  await logXBtn.click();
  await logY1Btn.click();
  await page.mouse.move(firstBox.x + firstBox.width * 0.4, firstBox.y + firstBox.height * 0.45);
  await expect(snapMarker).toBeVisible();
  await expect(coordinatePanel).toContainText(/^X: (?!NaN|Infinity).+, Y: (?!NaN|Infinity).+$/);
  const combinedLogSnapX = Number(await snapMarker.getAttribute('data-snap-x'));
  expect(combinedLogSnapX).toBeGreaterThan(20);
  expect(combinedLogSnapX).toBeLessThan(60);
  await logY1Btn.click();
  await logXBtn.click();

  const firstVariable = page.locator('.plot-sidebar label').first();
  const firstVariableName = (await firstVariable.innerText()).trim();
  await firstVariable.hover();
  await expect(page.locator('.plot-webgl[data-canvas-id="1"]')).toHaveAttribute('data-hovered-variable', firstVariableName);

  // A synthetic modifier-wheel zoom is supported by every input profile and
  // keeps this visibility assertion portable to touch-only WebKit contexts.
  await page.locator('.plot-webgl[data-canvas-id="1"]').dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
  await expect(page.getByRole('button', { name: 'Reset zoom' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset zoom' }).first().click();
  
  // Switch back to Single
  await singleBtn.click();
  console.log('Switched back to Single');
  
  // Verify return to single mode state
  await expect(page.getByText('Plot 1')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Log Y' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLogYBox = await page.getByRole('button', { name: 'Log Y', exact: true }).boundingBox();
  if (!mobileLogYBox) throw new Error('Mobile Log Y control has no layout bounds');
  expect(mobileLogYBox.x + mobileLogYBox.width).toBeLessThanOrEqual(390);
  const drawerToggle = page.getByRole('button', { name: 'Open plot variables' });
  await expect(drawerToggle).toBeVisible();
  await drawerToggle.click();
  await expect(page.locator('.plot-sidebar.overlay')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close plot variables' })).toBeVisible();
  await page.mouse.move(2, 840);
  await page.waitForTimeout(100);
  await page.screenshot({ path: testInfo.outputPath('plot-mobile.png') });
  
  console.log('Verification Complete');
});
