import { Button, Flex, Menu, Text } from "@chakra-ui/react";
import React, { Suspense, useEffect, useState } from "react";
import EditorCustom from "../editor/editorCustom";
import { Skeleton } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import { X, Play, Square, Settings } from "lucide-react";
import { SimulationType, ToBePlotted } from "../types/commonTypes";
import { useAppStore } from "../store/appStore";
import { addAcParameterToSource } from "../utils/sourceDetection";
import SimulationConfigPanel from "./SimulationConfigPanel";
import { dialogTheme } from "src/styles/uiThemes";
import SimulationGlobalConfigDialog from "./SimulationGlobalConfigDialog";

type SimulationEditorProps = {
  netList: string;
  onSwitchToSchematic?: () => void;
};

const SimulationEditor: React.FC<SimulationEditorProps> = ({
  netList = "",
  onSwitchToSchematic,
}) => {
  // Get state and actions from Zustand store
  const selectedSimType = useAppStore((state) => state.selectedSimType);
  const simulationConfig = useAppStore((state) => state.simulationConfig);
  const toBePlotted = useAppStore((state) => state.toBePlotted);
  const removeToBePlotted = useAppStore((state) => state.removeToBePlotted);
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  // Import handleNewResults from the main app store for handling simulation results
  const handleNewResults = useAppStore((state) => state.handleNewResults);

  // Bracket operation state
  const isParallelSimulationRunning = useAppStore(
    (state) => state.isParallelSimulationRunning
  );
  const bracketOperation = useAppStore((state) => state.bracketOperation);
  const runParallelSimulation = useAppStore(
    (state) => state.runParallelSimulation
  );

  // Local state for UI management
  const [netListToSim, setNetListToSim] = useState(netList);
  const [simCommandString, setSimCommandString] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setNetListToSim(value);
    }
  }, []);

  /**
   * Corrects instance values for ngspice compatibility.
   * ngspice has a bug where it doesn't accept "M" as a unit multiplier,
   * but accepts "Meg" instead. This function converts values like "1M" to "1Meg".
   * Handles both integer and fractional numbers (e.g., "2.01M" becomes "2.01Meg").
   */
  const correctUnitValueForNgspice = (value: string): string => {
    // Replace "M" with "Meg" only when it's at the end of the string or followed by non-letter characters
    // This regex matches numbers (including decimals) followed by "M" at word boundaries
    const correctedValue = value.replace(/(\d+(?:\.\d+)?)\s*M\b/g, "$1Meg");

    return correctedValue;
  };

  const saveCommandConfig = (toBePlotted: ToBePlotted[]) => {
    if (toBePlotted.length === 0) {
      return "";
    }

    const saveCommands = toBePlotted
      .map((item) => {
        if (item.type === "voltage") {
          return `v(${item.name})`;
        } else if (item.type === "current") {
          return `i(${item.name})`;
        }
        return "";
      })
      .filter((cmd) => cmd !== "");

    return `.save ${saveCommands.join(" ")}`;
  };

  // Update netlist when simulation type or configuration changes
  useEffect(() => {
    if (selectedSimType === "None") {
      setNetListToSim(netList);
      return;
    } else {
      const saveCommand = saveCommandConfig(toBePlotted);

      // For AC simulations, add "AC 1" to the selected source
      let baseNetList = netList;
      if (
        selectedSimType === "AC" &&
        simulationConfig &&
        simulationConfig.type === "AC" &&
        "source" in simulationConfig &&
        simulationConfig.source
      ) {
        baseNetList = addAcParameterToSource(netList, simulationConfig.source);
      }

      const newNetList =
        baseNetList +
        "\n\n" +
        simCommandString +
        "\n\n" +
        saveCommand +
        "\n\n" +
        ".end";
      setNetListToSim(newNetList);
    }
  }, [
    netList,
    simCommandString,
    selectedSimType,
    simulationConfig,
    toBePlotted,
  ]);

  // Handler for string-based config changes from config components
  const handleStringConfigChange = React.useCallback((configString: string) => {
    // Apply ngspice compatibility corrections to the config string
    const correctedConfigString = correctUnitValueForNgspice(configString);
    // Store the corrected SPICE command from config components
    setSimCommandString(correctedConfigString);
  }, []);

  // Handler for receiving the full configuration object from config components
  const handleFullConfigChange = React.useCallback((config: SimulationType) => {
    // Update the simulation config in the store so the useEffect can detect AC + source changes
    const { setSimulationConfig } = useAppStore.getState();
    setSimulationConfig(config);
  }, []);

  const handleSimRun = async () => {
    try {
      // First check if netlist contains bracket operations
      const { findFirstBracketOperation } = await import(
        "../utils/bracketParser"
      );
      const bracketOp = findFirstBracketOperation(netListToSim);

      if (bracketOp) {
        // Switch to plot tab immediately when bracket simulation starts
        const { setMainTabValue, setIsPlotTabEnabled } = useAppStore.getState();
        setIsPlotTabEnabled(true);
        setMainTabValue("plot");

        // Run parallel simulation for bracket operations
        console.log("Bracket operation detected, running parallel simulation");
        await runParallelSimulation(netListToSim);
        return;
      }

      // Standard single simulation
      const { Simulation } = await import("eecircuit-engine");

      const sim = new Simulation();
      await sim.start();

      sim.setNetList(netListToSim);

      const result = await sim.runSim();

      if (result) {
        // Check if the result has valid data and variables
        const hasData = result.data && result.data.length > 0;
        const hasVariables =
          result.variableNames && result.variableNames.length > 0;

        // Additional check for actual data points in the result
        let hasDataPoints = false;
        if (hasData) {
          hasDataPoints = result.data.some(
            (dataSet) => dataSet.values && dataSet.values.length > 0
          );
        }

        if (!hasData || !hasVariables || !hasDataPoints) {
          // Show error toast for empty results
          toaster.create({
            title: "Simulation Error",
            description:
              "Simulation run but no results were generated. Check your netlist and simulation configuration.",
            type: "error",
            duration: 5000,
          });
          console.error("Simulation completed but returned empty results.");
          return; // Don't call handleNewResults, preventing tab switch
        }

        // Valid results, proceed normally
        handleNewResults([result]);
      } else {
        // Show error toast for failed simulation
        toaster.create({
          title: "Simulation Error",
          description:
            "Simulation failed to run. Check your netlist for errors.",
          type: "error",
          duration: 5000,
        });
        console.error("Simulation failed or returned no results.");
      }
    } catch (error) {
      console.error("Simulation error:", error);
      toaster.create({
        title: "Simulation Error",
        description:
          error instanceof Error ? error.message : "Unknown simulation error",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Flex
      width="100%"
      flexDirection={{ base: "column", md: "row" }}
      height="100%"
      overflow={{ base: "auto", md: "hidden" }}
      position="relative"
      css={{
        "& *": {
          scrollbarWidth: "thin",
        },
        "&, & *": {
          overscrollBehavior: "contain",
        },
      }}
    >
      {/* Simulation configuration panel on the right/top */}
      <Flex
        flexDirection="column"
        height={{ base: "auto", md: "100%" }}
        minHeight="auto"
        position="relative"
        order={{ base: 1, md: 2 }}
        flexShrink={{ base: 1, md: 0 }}
        flexGrow={0}
      >
        <Flex
          flex={{ base: "none", md: "1" }}
          overflow={{ base: "visible", md: "hidden" }}
        >
          <SimulationConfigPanel
            onStringConfigChange={handleStringConfigChange}
            onFullConfigChange={handleFullConfigChange}
          />
        </Flex>

        {/* Simulation controls and progress */}
        <Flex
          flexDirection="column"
          minHeight="80px"
          padding="4"
          backgroundColor={dialogTheme.bg}
          borderTop="1px solid"
          borderColor={dialogTheme.borderColor}
          flexShrink={0}
          gap="2"
        >
          {/* Bracket operation info */}
          {bracketOperation && !isParallelSimulationRunning && (
            <Flex
              p="2"
              bg="blue.subtle"
              borderRadius="md"
              borderLeft="3px solid"
              borderColor="blue.solid"
            >
              <Text fontSize="sm" color="blue.fg">
                💡 Bracket operation detected: [{bracketOperation.start}:
                {bracketOperation.step}:{bracketOperation.stop}]
                {bracketOperation.unit && bracketOperation.unit}
              </Text>
            </Flex>
          )}

          {/* Simulation button */}
          <Button
            onClick={handleSimRun}
            width="100%"
            disabled={isParallelSimulationRunning}
          >
            <Flex alignItems="center" gap="2">
              {isParallelSimulationRunning ? (
                <Square size={16} />
              ) : (
                <Play size={16} />
              )}
              {isParallelSimulationRunning ? "Simulating..." : "Run Simulation"}
            </Flex>
          </Button>
        </Flex>
      </Flex>

      {/* Editor on the left/bottom */}
      <Flex
        flex={{ base: "0 0 auto", md: "1" }}
        flexDirection="column"
        height={{ base: "400px", md: "100%" }}
        minHeight={{ base: "400px", md: "auto" }}
        overflow="hidden"
        order={{ base: 2, md: 1 }}
        flexShrink={0}
      >
        <Flex
          padding="2"
          borderBottom="1px solid"
          borderColor={dialogTheme.borderColor}
          justifyContent="space-between"
          alignItems="center"
          gap="2"
        >
          <Flex gap="2" alignItems="center">
            {/* "To Be Plotted" button with dropdown if items exist */}
            {toBePlotted.length > 0 ? (
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button size="sm" variant="outline">
                    To Be Plotted ({toBePlotted.length})
                  </Button>
                </Menu.Trigger>
                <Menu.Positioner>
                  <Menu.Content>
                    {toBePlotted.map((item, index) => (
                      <Menu.Item
                        key={index}
                        value={`${item.type}-${item.name}`}
                      >
                        <Flex
                          justifyContent="space-between"
                          alignItems="center"
                          width="100%"
                        >
                          <span>
                            {item.type === "voltage" ? "V" : "I"}({item.name})
                          </span>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              removeToBePlotted(item);
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </Flex>
                      </Menu.Item>
                    ))}
                    <Menu.Separator />
                    <Menu.Item
                      value="add-more"
                      onClick={() => {
                        onSwitchToSchematic?.();
                      }}
                    >
                      Add More...
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onSwitchToSchematic?.();
                }}
              >
                To Be Plotted
              </Button>
            )}
          </Flex>

          {/* Simulation Configuration Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsConfigDialogOpen(true)}
            title="Simulation Settings"
          >
            <Settings size={16} />
          </Button>
        </Flex>

        <Suspense fallback={<Skeleton height="100%" width="100%" />}>
          <EditorCustom
            height="100%"
            width="100%"
            language="spice"
            value={netListToSim}
            valueChanged={handleEditor}
            theme={isDarkMode ? "dark" : "light"}
          />
        </Suspense>
      </Flex>

      {/* Config Dialog - positioned outside main layout */}
      <SimulationGlobalConfigDialog
        open={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
      />
    </Flex>
  );
};

export default SimulationEditor;
