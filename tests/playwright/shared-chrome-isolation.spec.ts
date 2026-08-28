import { expect, test } from "./fixtures";

const PROBE_NAME = "eecircuit-playwright-isolation-probe";

test.describe("shared headed Chrome isolation", () => {
  test("records disposable browser state in one test tab", async ({ page }) => {
    await page.goto("/?clean=true");

    await page.evaluate(async (probeName) => {
      localStorage.setItem(probeName, "local");
      sessionStorage.setItem(probeName, "session");
      document.cookie = `${probeName}=cookie; path=/`;

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(probeName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      });

      const cache = await caches.open(probeName);
      await cache.put(`/${probeName}`, new Response("cached"));
    }, PROBE_NAME);

    await expect
      .poll(() =>
        page.evaluate(
          (probeName) => document.cookie.includes(`${probeName}=cookie`),
          PROBE_NAME,
        ),
      )
      .toBe(true);
  });

  test("starts the next test tab without prior browser state", async ({ page }) => {
    await page.goto("/?clean=true");

    const remainingState = await page.evaluate(async (probeName) => {
      const databaseNames = (await indexedDB.databases()).map(
        (database) => database.name,
      );

      return {
        cacheExists: (await caches.keys()).includes(probeName),
        cookieExists: document.cookie.includes(`${probeName}=cookie`),
        databaseExists: databaseNames.includes(probeName),
        localStorageValue: localStorage.getItem(probeName),
        sessionStorageValue: sessionStorage.getItem(probeName),
      };
    }, PROBE_NAME);

    expect(remainingState).toEqual({
      cacheExists: false,
      cookieExists: false,
      databaseExists: false,
      localStorageValue: null,
      sessionStorageValue: null,
    });
  });
});
