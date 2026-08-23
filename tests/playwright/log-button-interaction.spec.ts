import { test, expect } from './fixtures';

test('Log button interaction', async ({ page }) => {
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
  await page.getByRole('button', { name: /Simulate/i }).first().click();
  
  // Verify we are on Simulate tab 
  await expect(page.getByText('Simulation Configuration', { exact: false }).first()).toBeVisible({ timeout: 10000 });
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
  console.log('Transited to Plot Tab');

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
  
  // Switch back to Single
  await singleBtn.click();
  console.log('Switched back to Single');
  
  // Verify return to single mode state
  await expect(page.getByText('Plot 1')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Log Y' })).toBeVisible();
  
  console.log('Verification Complete');
});
