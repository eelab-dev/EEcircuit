import { expect, type Page } from "./fixtures";

export async function waitForImportedCircuit(
  page: Page,
  { configCount, componentNames = [] }: { configCount: number; componentNames?: string[] },
) {
  await expect.poll(async () => page.evaluate(async ({ expectedNames }) => {
    type TestState = {
      allSimulationConfigs: unknown[];
      currentSchematic?: { componentInstances?: Array<{ name?: string }> };
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    const names = new Set(appState.currentSchematic?.componentInstances?.map((component) => component.name) ?? []);
    return {
      configCount: appState.allSimulationConfigs.length,
      hasExpectedComponents: expectedNames.every((name) => names.has(name)),
    };
  }, { expectedNames: componentNames }), { timeout: 15_000 }).toEqual({
    configCount,
    hasExpectedComponents: true,
  });
}
