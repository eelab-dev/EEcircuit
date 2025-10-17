import { test } from '@playwright/test';
import { testEEcircuit as testEEcircuit } from './lib/eecircuit-test';




test('EEcircuit', async ({ page }) => {
  const targetUrl = process.env.EECIRCUIT_URL ?? 'http://localhost:5173/';
  await testEEcircuit(page, targetUrl);
});
