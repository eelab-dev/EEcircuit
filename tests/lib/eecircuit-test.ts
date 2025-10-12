import { test, expect, Page } from '@playwright/test';
import { cloneAndGetLatestTag } from './getTags';
import { compareCSVFiles } from './compareCSV';

export async function testEEcircuit(page: Page, url: string) {
  const consoleErrors: string[] = [];
  const allRequests: {
    url: string;
    method: string;
    status?: number;
    headers?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    fromCache?: boolean;
  }[] = [];

  let isSimCompleted = false;

  // Capture console errors / logs
  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    console.log(`[console:${t}] ${text}`);
    if (t === 'error') {
      consoleErrors.push(text);
    }
    if (text.startsWith('Simulation run completed')) {
      isSimCompleted = true;
    }
  });

  // Capture network requests & responses
  page.on('requestfinished', async (request) => {
    try {
      const response = await request.response();
      // Safely detect whether the response was served from cache; Playwright's Response type may not include fromCache in typings.
      const resAny = response as any;
      let fromCache = false;
      if (resAny) {
        if (typeof resAny.fromCache === 'function') {
          try {
            fromCache = resAny.fromCache();
          } catch {
            fromCache = false;
          }
        } else if (typeof resAny.fromCache === 'boolean') {
          fromCache = resAny.fromCache;
        } else if (typeof resAny.fromServiceWorker === 'boolean') {
          // some Playwright versions expose different flags; use as fallback
          fromCache = resAny.fromServiceWorker;
        }
      }
      const reqInfo = {
        url: request.url(),
        method: request.method(),
        status: response?.status(),
        headers: request.headers(),
        responseHeaders: response?.headers(),
        fromCache,
      };
      allRequests.push(reqInfo);
      console.log(`[req finished] ${reqInfo.method} ${reqInfo.url} => ${reqInfo.status}`);
    } catch (err) {
      console.log('[reqfinished] error capturing response:', err);
    }
  });

  page.on('requestfailed', (request) => {
    console.log(`[req failed] ${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
    allRequests.push({
      url: request.url(),
      method: request.method(),
      status: undefined,
      headers: request.headers(),
      responseHeaders: undefined,
      fromCache: false,
    });
  });

  // Helper to wait for simulation completion via console
  function waitForSimCompletion(): Promise<void> {
    return new Promise((resolve) => {
      if (isSimCompleted) {
        return resolve();
      }
      const listener = () => {
        if (isSimCompleted) {
          resolve();
        } else {
          page.once('console', listener);
        }
      };
      page.once('console', listener);
    });
  }

  // Start
  console.log('*** Navigating to URL:', url);
  const resp = await page.goto(url, { waitUntil: 'networkidle' });
  console.log('Page.goto response status:', resp?.status(), 'url:', resp?.url());

  await expect(page).toHaveTitle(/EEcircuit/);

  // Now perform UI actions
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'De-select all' }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'De-select all' }).click();
  await page.locator('label').filter({ hasText: 'v(2)' }).locator('span').first().click();
  await page.getByRole('button', { name: 'Colorize' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Run' }).click();

  // Small wait to allow requests to fire
  await page.waitForTimeout(1000);

  console.log('Console errors so far:', consoleErrors);
  expect(consoleErrors.length, 'there were console errors').toBe(0);

  await page.getByRole('tab', { name: 'Info' }).click();

  await waitForSimCompletion();
  console.log('Simulation completed per console log');

  const text = await page.getByLabel('info', { exact: true }).inputValue();
  console.log('Info tab content:', text);

  const match = text.match(/ngspice-(\d+)/);
  const number = match ? parseInt(match[1]) : null;
  console.log('Parsed ngspice version from UI:', number);

  const tag = await cloneAndGetLatestTag('https://github.com/danchitnis/ngspice-sf-mirror', './tests/repos');
  const version = parseInt(tag?.split('-')[1] ?? '');
  console.log('Latest ngspice version from repo:', version);

  expect(number).toBe(version);

  await page.getByRole('tab', { name: 'CSV' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();

  const download = await downloadPromise;
  console.log('Download started, suggested filename:', download.suggestedFilename());
  await download.saveAs('./tests/output/' + download.suggestedFilename());

  const outPath = './tests/output/' + download.suggestedFilename();
  console.log('Saved CSV to:', outPath);

  const compare = await compareCSVFiles('./tests/lib/EEcircuit.csv', outPath);
  console.log('CSV compare result:', compare);
}
