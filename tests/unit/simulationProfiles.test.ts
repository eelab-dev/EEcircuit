import { describe, expect, it } from "vitest";
import {
  areSimulationConfigsEqual,
  createDemoSimulationConfigs,
  generateSimulationConfigName,
  isSimulationConfigComplete,
  isSimulationConfigNameAvailable,
  normalizeSimulationConfigs,
  simulationCommandFor,
} from "../../src/simulation/simulationProfiles";

describe("simulation profiles", () => {
  it("provides the complete demo DC and transient profiles", () => {
    const profiles = createDemoSimulationConfigs();
    expect(profiles).toEqual([
      { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1.8", step: "0.01" },
      { type: "Transient", name: "Transient-1", stopTime: "10m", timeStep: "10u", initialConditions: false },
    ]);
    expect(profiles.every(isSimulationConfigComplete)).toBe(true);
    expect(simulationCommandFor(profiles[0]!)).toBe(".dc vin 0 1.8 0.01");
  });

  it("normalizes missing and case-insensitive duplicate names without dropping profiles", () => {
    const profiles = normalizeSimulationConfigs([
      { type: "DC", name: "Sweep", source: "V1", start: "0", stop: "1", step: "0.1" },
      { type: "Transient", name: " sweep ", stopTime: "1m", timeStep: "10u" },
      { type: "DC", source: "V1", start: "1", stop: "2", step: "0.2" },
    ]);
    expect(profiles.map((profile) => profile.name)).toEqual(["Sweep", "Transient-1", "DC-1"]);
    expect(profiles).toHaveLength(3);
  });

  it("generates globally unique names and supports excluding the profile being renamed", () => {
    const profiles = createDemoSimulationConfigs();
    expect(generateSimulationConfigName("DC", profiles)).toBe("DC-2");
    expect(generateSimulationConfigName("DC", [
      ...profiles,
      { type: "Transient", name: "DC-2", stopTime: "2m", timeStep: "20u" },
    ])).toBe("DC-3");
    expect(isSimulationConfigNameAvailable(" transient-1 ", profiles)).toBe(false);
    expect(isSimulationConfigNameAvailable("dc-1", profiles, 0)).toBe(true);
  });

  it("compares complete profile values while normalizing optional transient defaults", () => {
    expect(areSimulationConfigsEqual(
      { type: "Transient", name: "Transient-1", stopTime: "1m", timeStep: "10u" },
      { type: "Transient", name: "Transient-1", stopTime: "1m", timeStep: "10u", initialConditions: false },
    )).toBe(true);
    expect(areSimulationConfigsEqual(
      { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1", step: "0.1" },
      { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "2", step: "0.1" },
    )).toBe(false);
  });
});
