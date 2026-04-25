import { Button, Flex, Menu, Text, Skeleton, Spinner } from "@chakra-ui/react";
import React, { Suspense, useEffect, useState } from "react";
import EditorCustom from "../editor/editorCustom";
import { X, Play } from "lucide-react";
import { SimulationType } from "../types/commonTypes";
import { useAppStore } from "../store/appStore";
import SimulationConfigPanel from "./SimulationConfigPanel";
import { dialogTheme } from "src/styles/uiThemes";
import { notifySimulationErrors } from "../utils/simulationErrorNotifier";
import {
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
  // selectedSimType and simulationConfig removed as unused
  const toBePlotted = useAppStore((state) => state.toBePlotted);
  const removeToBePlotted = useAppStore((state) => state.removeToBePlotted);
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  // Import handleNewResults from the main app store for handling simulation results
  const handleNewResults = useAppStore((state) => state.handleNewResults);
  const setMainTabValue = useAppStore((state) => state.setMainTabValue);
  const setIsPlottingTabEnabled = useAppStore((state) => state.setIsPlottingTabEnabled);
  const setSimulationConfig = useAppStore((state) => state.setSimulationConfig);

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
  const lastSimulationConfigRef = React.useRef<SimulationType | undefined>(undefined);
  const lastGeneratedNetlistRef = React.useRef<string | null>(null);
  const [isSimulationButtonLoading, setIsSimulationButtonLoading] = useState(false);
  const [hasAutoSwitchedToPlot, setHasAutoSwitchedToPlot] = useState(false);

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setNetListToSim(value);
    }
  }, []);

  // Sync netlist from store to local state for simulated editor/worker
  useEffect(() => {
    const hasNetlistChanged =
      lastGeneratedNetlistRef.current !== netList || netListNeedsRefresh;

    if (hasNetlistChanged) {
      lastGeneratedNetlistRef.current = netList;
      setNetListToSim(netList);
      if (netListNeedsRefresh) {
        acknowledgeNetListRefresh();
      }
    }
  }, [
    netList,
    netListNeedsRefresh,
    acknowledgeNetListRefresh,
  ]);

  useEffect(() => {
    if (isParallelSimulationRunning) {
      if (!hasAutoSwitchedToPlot) {
        setIsPlottingTabEnabled(true);
        setMainTabValue("plot");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasAutoSwitchedToPlot(true);
      }
      setIsSimulationButtonLoading(false);
    } else if (hasAutoSwitchedToPlot) {
      setHasAutoSwitchedToPlot(false);
    }
  }, [
    hasAutoSwitchedToPlot,
    isParallelSimulationRunning,
    setIsPlottingTabEnabled,
    setMainTabValue,
  ]);

  const isButtonLoading =
    isSimulationButtonLoading || isParallelSimulationRunning;
  const buttonLoadingText = isParallelSimulationRunning
    ? "Simulating"
    : "Loading engine";

  // Handler for full config changes from config components
  const handleFullConfigChange = React.useCallback(
    (config: SimulationType) => {
      // Update simulationConfig only if it has changed to avoid infinite loop
      // We also check for deep equality for objects
      if (
        JSON.stringify(lastSimulationConfigRef.current) !==
        JSON.stringify(config)
      ) {
        lastSimulationConfigRef.current = config;
        setSimulationConfig(config);
      }
    },
    [setSimulationConfig]
  );

  const handleSimRun = async () => {
    if (isSimulationButtonLoading || isParallelSimulationRunning) {
      return;
    }

    setIsSimulationButtonLoading(true);
    try {
      // Always clear previous results, optionally reset selections and plot state
      const {
        // setNetList, // Get setNetList action
        clearResults,
        resetVariableSelections,
        resetPlotState,
        resetVariableSelectionsOnNewSim,
        resetPlotStateOnNewSim,
        setNetList
      } = useAppStore.getState();

      const { generateDisplayNetlist, selectedSimType } = useAppStore.getState();
      
      let activeNetlist: string;

      if (selectedSimType === "None") {
        // If simulation config is None, use the editor content directly
        activeNetlist = netListToSim;
        // Sync store to match what's in the editor
        setNetList(activeNetlist);
      } else {
        // Otherwise, generate the netlist from the schematic
        await generateDisplayNetlist();
        activeNetlist = useAppStore.getState().netList;
      }

      if (resetVariableSelectionsOnNewSim) {
        resetVariableSelections();
      }

      if (resetPlotStateOnNewSim) {
        resetPlotState();
      }

      clearResults(); // Move here to ensure it runs before any sim launch

      // First check if netlist contains bracket operations
      const { findFirstBracketOperation } = await import(
        "../utils/bracketParser"
      );
      const bracketOp = findFirstBracketOperation(activeNetlist);

      if (bracketOp) {
        // Run parallel simulation for bracket operations
        await runParallelSimulation(activeNetlist);
        return;
      }

      // Standard single simulation (using worker for performance isolation)
      const { runSingleSimulation } = await import(
        "../simulation/parallelSimulation"
      );
      
      const simResult = await runSingleSimulation(activeNetlist);



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
      const engineErrors: string[] = [];
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
            {/* Configuration Panel */}
            <SimulationConfigPanel
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
