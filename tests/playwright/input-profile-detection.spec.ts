import { test, expect } from './fixtures';

test.describe('Input Profile Detection', () => {
    test('should detect iPad desktop mode as touchscreen', async ({ page }) => {
        // Override navigator properties before navigation
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel',
            });
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 5,
            });
            // Ensure not mobile UA effectively (default is usually desktop-like in playwright unless configured)
        });

        await page.goto('/');
        
        // Check the UI for the input profile icon/text
        // The header button has aria-label="Current input profile: touchscreen - Click to cycle"
        // Adjust locator to be loose on exact text if needed, but the aria label seems consistent
        const toggleButton = page.getByRole('button', { name: /Current input profile: touchscreen/i });
        await expect(toggleButton).toBeVisible();
    });
    
    test('should detect standard desktop as trackpad', async ({ page }) => {
        await page.addInitScript(() => {
             Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel',
            });
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 0,
            });
        });

        await page.goto('/');

        const toggleButton = page.getByRole('button', { name: /Current input profile: trackpad/i });
        await expect(toggleButton).toBeVisible();
    });

    test('should detect mobile as touchscreen', async ({ page }) => {
         // Use a mobile device descriptor or override UA
         // Here we manually override for precision
         await page.addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            });
        });

        await page.goto('/');

        const toggleButton = page.getByRole('button', { name: /Current input profile: touchscreen/i });
        await expect(toggleButton).toBeVisible();
    });
});
