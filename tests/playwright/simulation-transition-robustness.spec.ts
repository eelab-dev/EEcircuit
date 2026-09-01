import { test, expect, Page } from './fixtures';
import path from 'path';
import { waitForImportedCircuit } from './file-import-helpers';

const loadExCircuit = async (page: Page) => {
  console.log('Step: Load Test Circuit File');
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15000 });
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/test-circuit-tia.json'));
  await waitForImportedCircuit(page, { configCount: 0, componentNames: ['X1', 'CL'] });
  // Go to Simulate Tab
  const simulateBtn = page.getByLabel("Simulate Circuit");
  await expect(simulateBtn).toBeEnabled({ timeout: 10000 });
  await simulateBtn.click();
  // Wait for Run button
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });
  await expect(runBtn).toBeEnabled({ timeout: 10000 });
};

const runNoise = async (page: Page, round: number) => {
  console.log(`Step: Configure and Run Noise Simulation (Round ${round})`);
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });

  // Ensure we are on Simulate tab
  const simTab = page.getByRole('tab', { name: 'Simulation' });
  if (await simTab.getAttribute('aria-selected') !== 'true') {
      await simTab.click();
  }

  await page.getByText('Noise', { exact: true }).click();
  await page.getByLabel('Output Net Name').selectOption('out');
  await page.getByLabel('Input Source').selectOption('Iin');
  await page.getByLabel('Steps').fill('20');
  await page.getByLabel('Start Frequency').fill('1');
  await page.getByLabel('Stop Frequency').fill('1G');
  
  await expect(runBtn).toBeEnabled();
  await runBtn.click();

  console.log(`Step: Verify Noise Plot State (Round ${round})`);
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  
  await expect(page.getByText('onoise_spectrum')).toBeVisible({timeout: 10000});
  
  // Verify Single Plot: 'Log Y' should be visible, 'Log Y1' should NOT be visible
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  const logYBtn = page.getByRole('button', { name: 'Log Y' });
  const logY1Btn = page.getByRole('button', { name: 'Log Y1' });
  
  await expect(logYBtn).toBeVisible(); 
  await expect(logY1Btn).not.toBeVisible();

  // Verify Log X and Log Y are BOTH active for Noise
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(logYBtn).toHaveAttribute('aria-pressed', 'true');
  
};

const runTransient = async (page: Page, round: number) => {
  console.log(`Step: Configure and Run Transient Simulation (Round ${round})`);
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });

  await page.getByRole('tab', { name: 'Simulation' }).click();
  await page.getByText('Transient', { exact: true }).click();
  await page.getByLabel('Stop Time').fill('100u');
  await page.getByLabel('Time Step').fill('10n');
  
  await expect(runBtn).toBeEnabled();
  await runBtn.click();

  console.log(`Step: Verify Transient Plot State (Round ${round})`);
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();
  
  // Verify 'v(out)' and NO 'onoise_spectrum'
  await expect(page.getByText('v(out)')).toBeVisible();
  await expect(page.getByText('onoise_spectrum')).not.toBeVisible();

  // Verify Single Plot: 'Log Y' should be visible, 'Log Y1' should NOT be visible
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  const logYBtn = page.getByRole('button', { name: 'Log Y' });
  const logY1Btn = page.getByRole('button', { name: 'Log Y1' });

  await expect(logYBtn).toBeVisible();
  await expect(logY1Btn).not.toBeVisible();

  // Verify Log X and Log Y are BOTH inactive for Transient
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(logYBtn).toHaveAttribute('aria-pressed', 'false');

};

const runAC = async (page: Page) => {
  console.log('Step: Configure and Run AC Simulation');
  const runBtn = page.getByRole('button', { name: /Run Simulation|Run/i });
  
  await page.getByRole('tab', { name: 'Simulation' }).click();
  
  await page.getByText('AC', { exact: true }).click();
  
  // Wait for config form
  await expect(page.getByLabel('Start Frequency')).toBeVisible();

  await page.getByLabel('Source').selectOption('Iin');
  await page.getByLabel('Sweep Type').selectOption('dec');
  await page.getByLabel('Start Frequency').fill('1');
  await page.getByLabel('Stop Frequency').fill('1000M');
  await page.getByLabel('Steps Number').fill('20');

  await expect(runBtn).toBeEnabled();
  
  await runBtn.click();

  console.log('Step: Verify AC Plot State');
  const plotTab = page.getByRole('tab', { name: 'Plot' });
  await expect(plotTab).toBeVisible();

  // Dual plot headers
  await expect(page.getByText('Magnitude').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Phase').first()).toBeVisible();
  
  // Verify Dual Plot: 'Log Y1' should be visible
  const logXBtn = page.getByRole('button', { name: 'Log X' });
  const logY1Btn = page.getByRole('button', { name: 'Log Y1' });
  const logY2Btn = page.getByRole('button', { name: 'Log Y2' });
  
  await expect(logY1Btn).toBeVisible();
  await expect(logY2Btn).toBeVisible();

  // Verify Log states for AC: Log X (Active), Log Y1 (Active), Log Y2 (Disabled)
  await expect(logXBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(logY1Btn).toHaveAttribute('aria-pressed', 'true');
  await expect(logY2Btn).toHaveAttribute('aria-pressed', 'false');

};

test('verify simulation robustness across Noise -> Transient -> AC -> Noise -> Transient transitions', async ({ page }) => {
  test.setTimeout(180000); 

  await loadExCircuit(page);

  // Round 1
  await runNoise(page, 1);
  await runTransient(page, 1);

  // Interleaved AC
  await runAC(page);

  // Round 2
  await runNoise(page, 2);
  await runTransient(page, 2);

});
