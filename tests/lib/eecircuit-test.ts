import { test, expect, Page } from '@playwright/test';
import { cloneAndGetLatestTag } from './getTags';
import { compareCSVFiles } from './compareCSV';



export async function testEEcircuit(page: Page, url: string) {
    const consoleErrors: string[] = [];

    let isSimCompleted: boolean = false;

    // Listen for console errors
    page.on('console', (msg: any) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            console.log('Error:', msg.text());
        }

        if (msg.text().startsWith('Simulation run completed')) {
            isSimCompleted = true;

        };
    });

    // Function to wait for the simulation to complete
    function waitForSimCompletion(): Promise<void> {
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (isSimCompleted) {
                    resolve();
                } else {
                    // Re-check after the next console message or event loop tick
                    page.once('console', checkCompletion);
                }
            };
            checkCompletion();
        });
    }


    await page.goto(url);

    await expect(page).toHaveTitle(/EEcircuit/);

    await page.getByRole('button', { name: 'Run' }).click();

    await page.getByRole('button', { name: 'De-select all' }).click();
    await page.getByRole('button', { name: 'Select all', exact: true }).click();
    await page.getByRole('button', { name: 'De-select all' }).click();
    await page.locator('label').filter({ hasText: 'v(2)' }).locator('span').first().click();
    await page.getByRole('button', { name: 'Colorize' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Close').click();

    await page.getByRole('button', { name: 'Run' }).click();

    await page.waitForTimeout(1000);
    expect(consoleErrors.length).toBe(0);

    await page.getByRole('tab', { name: 'Info' }).click();

    // Wait for simulation to complete without using a timeout
    await waitForSimCompletion();

    const text = await page.getByLabel('info', { exact: true }).inputValue();

    const match = text.match(/ngspice-(\d+)/);
    const number = match ? parseInt(match[1]) : null;

    console.log('ngspice version from EEcircuit:', number);

    const tag = await cloneAndGetLatestTag('https://github.com/danchitnis/ngspice-sf-mirror', './tests/repos');

    const version = parseInt(tag?.split('-')[1] ?? '');

    console.log('ngspice version from repo:', version);

    expect(number).toBe(version);

    await page.getByRole('tab', { name: 'CSV' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();

    const download = await downloadPromise;
    await download.saveAs('./tests/output/' + download.suggestedFilename());

    const compare = await compareCSVFiles('./tests/lib/EEcircuit.csv', './tests/output/' + download.suggestedFilename());
}