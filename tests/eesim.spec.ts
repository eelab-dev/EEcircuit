import { test } from '@playwright/test';
import { testEEsim } from './lib/eesim-test';




test('EEsim Prod', async ({ page }) => {

  await testEEsim(page, 'https://eesim.dev/');

});


test('EEsim Next', async ({ page }) => {

  await testEEsim(page, 'https://next.eesim.dev/');

});