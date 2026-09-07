import { SimulationType } from "../types/commonTypes";
import { createDemoSimulationConfigs, normalizeSimulationConfigs } from "../simulation/simulationProfiles";

const STORAGE_KEY_SIMULATION_CONFIGS = "eecircuit-simulation-configs";

/**
 * Safely saves simulation configurations to localStorage
 */
export const saveSimulationConfigs = (configs: SimulationType[]): void => {
  try {
    const serialized = JSON.stringify(configs);
    localStorage.setItem(STORAGE_KEY_SIMULATION_CONFIGS, serialized);
  } catch (error) {
    console.warn("Failed to save simulation configs to localStorage:", error);
  }
};

/**
 * Safely loads simulation configurations from localStorage
 */
export const loadSimulationConfigs = (): SimulationType[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIMULATION_CONFIGS);
    if (stored === null) {
      return createDemoSimulationConfigs();
    }

    const parsed = JSON.parse(stored);
    
    if (!Array.isArray(parsed)) {
      console.warn("Invalid simulation configs format in localStorage, returning empty array");
      return [];
    }

    return normalizeSimulationConfigs(parsed.filter((config): config is SimulationType => {
      return (
        typeof config === "object" &&
        config !== null &&
        "type" in config &&
        (config.type === "None" ||
          config.type === "DC" ||
          config.type === "AC" ||
          config.type === "Transient" ||
          config.type === "Noise")
      );
    }));
  } catch (error) {
    console.warn("Failed to load simulation configs from localStorage:", error);
    return [];
  }
};

/**
 * Clears simulation configurations from localStorage
 */
export const clearSimulationConfigs = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_SIMULATION_CONFIGS);
  } catch (error) {
    console.warn("Failed to clear simulation configs from localStorage:", error);
  }
};

/**
 * Checks if localStorage is available and working
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};
