import { test } from '@playwright/test';
import { testEEcircuit as testEEcircuit } from './lib/eecircuit-test';




test('EEcircuit Prod', async ({ page }) => {

  await testEEcircuit(page, 'https://eecircuit.com/');

});


test('EEcircuit Next', async ({ page }) => {

  await testEEcircuit(page, 'https://next.eecircuit.com/');

});