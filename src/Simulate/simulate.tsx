import { Button, Flex, Menu, Text, Skeleton, Spinner } from "@chakra-ui/react";
import React, { Suspense, useEffect, useState } from "react";
import EditorCustom from "../editor/editorCustom";
import { X, Play } from "lucide-react";
import { SimulationType } from "../types/commonTypes";
import { useAppStore } from "../store/appStore";
import { addAcParameterToSource } from "../utils/sourceDetection";
import SimulationConfigPanel from "./SimulationConfigPanel";
import { dialogTheme } from "src/styles/uiThemes";
import { notifySimulationErrors } from "../utils/simulationErrorNotifier";
import {
  buildToBePlottedCommands,
  formatToBePlottedLabel,
} from "../utils/toBePlotted";

type SimulationEditorProps = {
  onSwitchToSchematic?: () => void;
};

const SimulationEditor: React.FC<SimulationEditorProps> = ({
  onSwitchToSchematic,
}) => {
  // Get state and actions from Zustand store
  const netList = useAppStore((state) => state.netList);
  const netListNeedsRefresh = useAppStore((state) => state.netListNeedsRefresh);
  const acknowledgeNetListRefresh = useAppStore(
    (state) => state.acknowledgeNetListRefresh
  );
  const selectedSimType = useAppStore((state) => state.selectedSimType);
  const simulationConfig = useAppStore((state) => state.simulationConfig);
  const toBePlotted = useAppStore((state) => state.toBePlotted);
  const removeToBePlotted = useAppStore((state) => state.removeToBePlotted);
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  // Import handleNewResults from the main app store for handling simulation results
  const handleNewResults = useAppStore((state) => state.handleNewResults);
  const setMainTabValue = useAppStore((state) => state.setMainTabValue);
  const setIsPlotTabEnabled = useAppStore((state) => state.setIsPlotTabEnabled);

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
  const lastSimCommandRef = React.useRef("");
  const lastSimulationConfigRef = React.useRef<SimulationType | undefined>(undefined);
  const lastGeneratedNetlistRef = React.useRef<string | null>(null);
  const [isSimulationButtonLoading, setIsSimulationButtonLoading] = useState(false);
  const [hasAutoSwitchedToPlot, setHasAutoSwitchedToPlot] = useState(false);

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

  // Update netlist when simulation type or configuration changes
  useEffect(() => {
    if (selectedSimType === "None") {
      const hasNetlistChanged =
        lastGeneratedNetlistRef.current !== netList || netListNeedsRefresh;

      if (hasNetlistChanged) {
        lastGeneratedNetlistRef.current = netList;
        setNetListToSim(netList);
        if (netListNeedsRefresh) {
          acknowledgeNetListRefresh();
        }
      }
      return;
    } else {
      const plotCommands = buildToBePlottedCommands(toBePlotted);

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

      const netlistSections = [baseNetList];

      if (simCommandString.trim()) {
        netlistSections.push(simCommandString);
      }

      if (plotCommands.trim()) {
        netlistSections.push(plotCommands);
      }

      netlistSections.push(".end");

      const newNetList = netlistSections.join("\n\n");
      const shouldUpdate =
        lastGeneratedNetlistRef.current !== newNetList || netListNeedsRefresh;

      if (shouldUpdate) {
        lastGeneratedNetlistRef.current = newNetList;
        setNetListToSim(newNetList);
        if (netListNeedsRefresh) {
          acknowledgeNetListRefresh();
        }
      }
    }
  }, [
    netList,
    netListNeedsRefresh,
    simCommandString,
    selectedSimType,
    simulationConfig,
    toBePlotted,
    acknowledgeNetListRefresh,
  ]);

  useEffect(() => {
    if (isParallelSimulationRunning) {
      if (!hasAutoSwitchedToPlot) {
        setIsPlotTabEnabled(true);
        setMainTabValue("plot");
        setHasAutoSwitchedToPlot(true);
      }
      setIsSimulationButtonLoading(false);
    } else if (hasAutoSwitchedToPlot) {
      setHasAutoSwitchedToPlot(false);
    }
  }, [
    hasAutoSwitchedToPlot,
    isParallelSimulationRunning,
    setIsPlotTabEnabled,
    setMainTabValue,
  ]);

  const isButtonLoading =
    isSimulationButtonLoading || isParallelSimulationRunning;
  const buttonLoadingText = isParallelSimulationRunning
    ? "Simulating"
    : "Loading engine";

  // Handler for string-based config changes from config components
  const handleStringConfigChange = React.useCallback((configString: string) => {
    // Apply ngspice compatibility corrections to the config string
    const correctedConfigString = correctUnitValueForNgspice(configString);
    if (lastSimCommandRef.current !== correctedConfigString) {
      lastSimCommandRef.current = correctedConfigString;
      setSimCommandString(correctedConfigString);
    }
  }, []);

  // Handler for receiving the full configuration object from config components
  const handleFullConfigChange = React.useCallback((config: SimulationType) => {
    // Update the simulation config in the store so the useEffect can detect AC + source changes
    const { setSimulationConfig } = useAppStore.getState();
    const serializedPrev = JSON.stringify(lastSimulationConfigRef.current);
    const serializedNext = JSON.stringify(config);

    if (serializedPrev !== serializedNext) {
      lastSimulationConfigRef.current = config;
      setSimulationConfig(config);
    }
  }, []);

  const handleSimRun = async () => {
    if (isSimulationButtonLoading || isParallelSimulationRunning) {
      return;
    }

    setIsSimulationButtonLoading(true);
    let readEngineErrors: (() => string[]) | undefined;
    try {
      // Always clear previous results, optionally reset selections and plot state
      const {
        clearResults,
        resetVariableSelections,
        resetPlotState,
        resetVariableSelectionsOnNewSim,
        resetPlotStateOnNewSim,
      } = useAppStore.getState();

      clearResults(); // Always clear previous results

      if (resetVariableSelectionsOnNewSim) {
        resetVariableSelections();
      }

      if (resetPlotStateOnNewSim) {
        resetPlotState();
      }

      // First check if netlist contains bracket operations
      const { findFirstBracketOperation } = await import(
        "../utils/bracketParser"
      );
      const bracketOp = findFirstBracketOperation(netListToSim);

      if (bracketOp) {
        // Run parallel simulation for bracket operations
        console.log("Bracket operation detected, running parallel simulation");
        await runParallelSimulation(netListToSim);
        return;
      }

      // Standard single simulation (using worker for performance isolation)
      const { runSingleSimulation } = await import(
        "../simulation/parallelSimulation"
      );

      const start = performance.now();
      const simResult = await runSingleSimulation(netListToSim);
      const end = performance.now();
      const duration = end - start;

      // Update window for testing/debugging
      // @ts-ignore
      window.lastSimulationDuration = duration;

      if (!simResult.success) {
        notifySimulationErrors(
          simResult.errorDetails || [],
          simResult.errorMessage ||
            "Simulation failed to run. Check your netlist for errors."
        );
        return;
      }

      // Valid results, proceed normally
      if (simResult.result) {
        handleNewResults([simResult.result]);
      }

      if (simResult.errorDetails && simResult.errorDetails.length > 0) {
        notifySimulationErrors(simResult.errorDetails);
      }
    } catch (error) {
      console.error("Simulation error:", error);
      const engineErrors = readEngineErrors ? readEngineErrors() : [];
      notifySimulationErrors(
        engineErrors,
        error instanceof Error ? error.message : "Unknown simulation error"
      );
    } finally {
      setIsSimulationButtonLoading(false);
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
            disabled={isButtonLoading}
            loading={isButtonLoading}
            loadingText={buttonLoadingText}
            spinner={<Spinner boxSize="16px" />}
            aria-busy={isButtonLoading}
          >
            <Flex alignItems="center" gap="2">
              <Play size={16} />
              Run Simulation
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
                    {toBePlotted.map((item, index) => {
                      const label = formatToBePlottedLabel(item);
                      const value =
                        item.type === "voltage"
                          ? `voltage-${item.netName}`
                          : `current-${item.componentName}-${item.terminalName}`;

                      return (
                        <Menu.Item key={index} value={value}>
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                            width="100%"
                          >
                            <span>{label}</span>
                            <Button
                              size="xs"
                              variant="ghost"
                              aria-label={`Remove ${label} from To Be Plotted`}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                removeToBePlotted(item);
                              }}
                            >
                              <X size={12} />
                            </Button>
                          </Flex>
                        </Menu.Item>
                      );
                    })}
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

    </Flex>
  );
};

export default SimulationEditor;
