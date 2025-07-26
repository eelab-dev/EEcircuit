"use client";
import React, { useState, useRef } from "react";

//const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));
//const PlotArray = React.lazy(() => import("./plotArray.tsx"));
//const DisplayBox = React.lazy(() => import("./displayBox.tsx"));

import { Box, Flex, Tabs, Text, IconButton } from "@chakra-ui/react";

import { Toaster } from "./components/ui/toaster.tsx";
import { Tooltip } from "./components/ui/tooltip.tsx";

import Schematic from "./schematic/schematic.tsx";
import SimulationEditor from "./Simulate/simulate.tsx";
import { TabsValueChangeDetails } from "node_modules/@chakra-ui/react/dist/types/components/tabs/tabs";
import Logo from "./logo.tsx";
import Plot from "./plot/plot.tsx";
import { ResultType } from "eecircuit-engine";
import { sendCommand, Schematic as SchematicType } from "eecircuit-schematic";
import {
  EEcircuitFile,
  SimulationType,
  ToBePlotted,
} from "./types/commonTypes.ts";
import { Mouse, Touchpad, Download } from "lucide-react";

type TabsValue = "schematic" | "simulate" | "plot";

const EEcircuit: React.FC = () => {
  // Create the count state.

  const [netList, setNetList] = React.useState("");
  //const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabValue, setTabValue] = React.useState<TabsValue>("schematic");
  const [shouldFitToScreen, setShouldFitToScreen] = React.useState(false);
  const [hasResizedSinceSchematicView, setHasResizedSinceSchematicView] =
    React.useState(false);
  const [hasViewedSchematic, setHasViewedSchematic] = React.useState(false);

  //const colorMode = useColorModeValue("light", "dark");

  const [results, setResults] = React.useState<ResultType[]>([]);

  // Simulation configuration state - uplifted from SimulationEditor
  const [selectedSimType, setSelectedSimType] =
    React.useState<SimulationType["type"]>("None");
  const [simulationConfig, setSimulationConfig] = React.useState<
    SimulationType | undefined
  >(undefined);

  // State to store all simulation configurations from SimulationEditor
  // This allows saving all configs when user triggers save action
  const [allSimulationConfigs, setAllSimulationConfigs] = useState<
    SimulationType[]
  >([]);

  // Ref to store current schematic data for saving (using ref to avoid closure issues)
  const currentSchematicRef = useRef<SchematicType | undefined>(undefined);
  // Ref to store promise resolver for schematic save operations
  const schematicSaveResolverRef = useRef<
    ((data: SchematicType) => void) | null
  >(null);

  // Handler for schematic data changes
  const handleSchematicDataChange = React.useCallback(
    (schematicData: SchematicType) => {
      currentSchematicRef.current = schematicData; // Store in ref for immediate access

      // If there's a pending save operation, resolve it with the new data
      if (schematicSaveResolverRef.current) {
        schematicSaveResolverRef.current(schematicData);
        schematicSaveResolverRef.current = null; // Clear the resolver
      }
    },
    []
  );

  // Handler for simulation configuration changes
  const handleSimulationConfigChange = React.useCallback(
    (config: SimulationType) => {
      setSelectedSimType(config.type);
      setSimulationConfig(config);
    },
    []
  );

  // Handler for all simulation configs changes from SimulationEditor
  const handleAllSimulationConfigsChange = React.useCallback(
    (configs: SimulationType[]) => {
      setAllSimulationConfigs(configs);
    },
    []
  );

  // Tab enablement states
  const [isSimulateTabEnabled, setIsSimulateTabEnabled] = React.useState(false);
  const [isPlotTabEnabled, setIsPlotTabEnabled] = React.useState(false);

  // Input profile state - defaults to trackpad
  const [inputProfile, setInputProfile] = React.useState<"mouse" | "trackpad">(
    "trackpad"
  );

  // Plot selection mode state
  const [isPlotSelectionMode, setIsPlotSelectionMode] = React.useState(false);
  const [toBePlotted, setToBePlotted] = React.useState<ToBePlotted[]>([]);

  const [dragBox, setDragBox] = React.useState(false);

  // Ref for the tabs container to handle drag and drop
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  // Track window resize events
  React.useEffect(() => {
    const handleResize = () => {
      setHasResizedSinceSchematicView(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle initial schematic view (when component mounts and schematic is the default tab)
  React.useEffect(() => {
    if (tabValue === "schematic" && !hasViewedSchematic) {
      // Delay the fit command to ensure canvas is ready
      const timer = setTimeout(() => {
        setShouldFitToScreen(true);
        setHasViewedSchematic(true);
      }, 200); // Longer delay for initial load
      return () => clearTimeout(timer);
    }
  }, [tabValue, hasViewedSchematic]);

  // Reset shouldFitToScreen flag after it's been processed
  React.useEffect(() => {
    if (shouldFitToScreen) {
      const timer = setTimeout(() => {
        setShouldFitToScreen(false);
      }, 100); // Small delay to ensure the command is processed
      return () => clearTimeout(timer);
    }
  }, [shouldFitToScreen]);

  // Callback when canvas is resized
  const handleCanvasResized = React.useCallback(() => {
    setHasResizedSinceSchematicView(false);
  }, []);

  const exportedNetlist = React.useCallback((netlist: string) => {
    const netListPreamble = `
* Netlist generated by EEcircuit
.include modelcard.CMOS90
`;

    const netlistWithPreamble = netListPreamble + netlist;
    setNetList(netlistWithPreamble);
    setIsSimulateTabEnabled(true); // Enable simulate tab when netlist is exported
    setTabValue("simulate");
  }, []);

  const handleTabValueChange = React.useCallback(
    (details: TabsValueChangeDetails) => {
      const newTabValue = details.value as TabsValue;

      // Prevent switching to disabled tabs
      if (newTabValue === "simulate" && !isSimulateTabEnabled) {
        return;
      }
      if (newTabValue === "plot" && !isPlotTabEnabled) {
        return;
      }

      setTabValue(newTabValue);

      // Handle schematic tab activation
      if (newTabValue === "schematic") {
        // IMPORTANT: Only use fit-to-screen for initial app initialization or window resize
        // NEVER use fit-to-screen for regular tab switches - view restoration handles that
        if (!hasViewedSchematic || hasResizedSinceSchematicView) {
          // Small delay to ensure tab content is visible and canvas is ready
          setTimeout(() => {
            setShouldFitToScreen(true);
            setHasViewedSchematic(true);
            // Note: hasResizedSinceSchematicView will be reset by the onCanvasResized callback
            // when the canvas is actually resized, not immediately here
          }, 100);
        }
      } else {
        // Reset fit to screen flag when leaving schematic tab
        setShouldFitToScreen(false);
      }
    },
    [
      hasViewedSchematic,
      hasResizedSinceSchematicView,
      isSimulateTabEnabled,
      isPlotTabEnabled,
    ]
  );

  // Add drag and drop support for schematic files
  React.useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Validate file type - accept common schematic file extensions
    const isValidSchematicFile = (file: File): boolean => {
      return (
        file.type === "application/json" ||
        file.type === "text/plain" ||
        file.type === "application/xml"
      );
    };

    const handleDragOver = (e: DragEvent) => {
      preventDefault(e);
      // Only show visual feedback if we have files
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setDragBox(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      preventDefault(e);
      // Only hide dragBox if we're actually leaving the container
      // Check if the related target is still within our container
      const relatedTarget = e.relatedTarget as Node;
      if (!relatedTarget || !container.contains(relatedTarget)) {
        setDragBox(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      preventDefault(e);
      setDragBox(false);

      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      const file = files[0];

      // Validate file type
      if (!isValidSchematicFile(file)) {
        console.warn(
          "Invalid file type dropped. Please drop a valid schematic file."
        );
        return;
      }

      try {
        const content = await file.text();
        const parsedContent: EEcircuitFile = JSON.parse(content);
        // check the schema version is correct
        if (parsedContent.schema !== "EEcircuitV1") {
          console.error(
            "Invalid schema version. Please drop a valid EEcircuit file."
          );
          return;
        }
        if (parsedContent.schematic) {
          // Use the imported sendCommand from eecircuit-schematic
          await sendCommand({
            command: "loadSchematic",
            schematic: parsedContent.schematic,
          });
        }

        // Restore simulation configurations if they exist
        if (parsedContent.simulations && parsedContent.simulations.length > 0) {
          // For now, load the first simulation configuration as the active one
          // In the future, this could be enhanced to load all configurations
          const firstSimConfig = parsedContent.simulations[0];
          setSelectedSimType(firstSimConfig.type);
          setSimulationConfig(firstSimConfig);
        } else {
          // Reset simulation config if no simulation data in file
          setSimulationConfig(undefined);
          setSelectedSimType("None");
        }
      } catch (error) {
        console.error("Failed to load schematic from dropped file:", error);
        alert(
          "Failed to load schematic from dropped file. Please ensure the file is valid."
        );
      }
    };

    // Add event listeners
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragenter", preventDefault);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);

    // Clean up
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("dragenter", preventDefault);
      container.removeEventListener("dragleave", handleDragLeave);
      container.removeEventListener("drop", handleDrop);
    };
  }, []); // Remove dragBox dependency to prevent unnecessary re-registrations

  const handleNewResults = React.useCallback((newResults: ResultType[]) => {
    // Double-check that we have valid results before enabling plot tab
    const hasValidResults =
      newResults &&
      newResults.length > 0 &&
      newResults[0].data &&
      newResults[0].data.length > 0 &&
      newResults[0].variableNames &&
      newResults[0].variableNames.length > 0;

    // Additional check for actual data points
    let hasDataPoints = false;
    if (hasValidResults) {
      hasDataPoints = newResults[0].data.some(
        (dataSet) => dataSet.values && dataSet.values.length > 0
      );
    }

    if (hasValidResults && hasDataPoints) {
      setResults(newResults);
      setIsPlotTabEnabled(true); // Enable plot tab when valid results are obtained
      setTabValue("plot");
    } else {
      // This should not happen if simulate.tsx is working correctly, but just in case
      console.warn(
        "handleNewResults called with invalid results, not enabling plot tab"
      );
    }
  }, []);

  // Handler for input profile toggle
  const handleInputProfileToggle = React.useCallback(() => {
    const newProfile = inputProfile === "mouse" ? "trackpad" : "mouse";
    setInputProfile(newProfile);

    // Send command to update input profile in schematic canvas
    sendCommand({
      command: "setInputProfile",
      profile: newProfile,
    });
  }, [inputProfile]);

  // Handler for switching to schematic for plot selection
  const handleSwitchToSchematicForPlotSelection = React.useCallback(() => {
    setIsPlotSelectionMode(true);
    setTabValue("schematic");
  }, []);

  // Handler for when a plot item is selected in schematic
  const handlePlotItemSelected = React.useCallback((item: ToBePlotted) => {
    setToBePlotted((prev) => {
      // Check if item already exists
      const exists = prev.some(
        (existing) => existing.type === item.type && existing.name === item.name
      );

      if (!exists) {
        return [...prev, item];
      }

      return prev;
    });
  }, []);

  // Handler for exiting plot selection mode
  const handleExitPlotSelectionMode = React.useCallback(() => {
    setIsPlotSelectionMode(false);
    setTabValue("simulate");
  }, []);

  // Helper function to wait for schematic export completion
  const waitForSchematicExport =
    React.useCallback((): Promise<SchematicType> => {
      return new Promise((resolve, reject) => {
        // Set up a timeout as a fallback (much shorter than before)
        const timeout = setTimeout(() => {
          schematicSaveResolverRef.current = null;
          reject(new Error("Schematic export timeout - no response received"));
        }, 5000); // 5 second fallback timeout

        // Store the resolver to be called when schematic data is received
        schematicSaveResolverRef.current = (data: SchematicType) => {
          clearTimeout(timeout);
          resolve(data);
        };
      });
    }, []);

  // Handler for saving the EEcircuit file
  const handleSaveFile = React.useCallback(async () => {
    try {
      // Switch to schematic tab if not already there to ensure canvas is active
      if (tabValue !== "schematic") {
        setTabValue("schematic");
        // Wait for tab switch to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Trigger schematic export and wait for the response
      sendCommand({
        command: "export",
        exportType: "schematic",
      });

      // Wait for schematic data using promise-based approach (no fixed timeout!)
      const latestSchematicData = await waitForSchematicExport();

      const validSimConfigs = allSimulationConfigs.filter(
        (config) => config.type !== "None"
      );

      const eeCirFile: EEcircuitFile = {
        schema: "EEcircuitV1",
        title: "EEcircuit",
        description: "EEcircuit Schematic",
        date: new Date().toISOString(),
        schematic: latestSchematicData,
        simulations: validSimConfigs.length > 0 ? validSimConfigs : undefined,
      };

      const fileContent = JSON.stringify(eeCirFile, null, 2);
      const blob = new Blob([fileContent], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "EEcircuit-" + new Date().toISOString() + ".json";

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const schematicInfo = latestSchematicData ? "schematic and " : "";
      if (validSimConfigs.length > 0 || latestSchematicData) {
        alert(
          `Successfully saved ${schematicInfo}${validSimConfigs.length} simulation configuration(s)!`
        );
      } else {
        alert(
          "No schematic or simulation configurations to save. Create a schematic or configs first."
        );
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
    }
  }, [allSimulationConfigs, tabValue, waitForSchematicExport]); // Added waitForSchematicExport

  return (
    <Box
      border="solid 0px"
      p={2}
      height={"100vh"}
      display={"flex"}
      flexDirection={"column"}
      overflow="hidden"
    >
      <Flex direction="row" alignItems={"self-end"} gapX={2} flexShrink={0}>
        <Logo />
        <Text>a SPICE based circuit simulator</Text>
      </Flex>

      <Tabs.Root
        ref={tabsContainerRef}
        defaultValue="schematic"
        value={tabValue}
        onValueChange={handleTabValueChange}
        variant="subtle"
        display={"flex"}
        flexDirection="column"
        flex={1}
        minHeight={0}
        position="relative"
      >
        {dragBox ? (
          <Box
            bg="blue.400/80"
            width="100%"
            height="100%"
            position="absolute"
            top={0}
            left={0}
            zIndex={1000}
          >
            <Flex
              direction="column"
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
            >
              <Box
                p={4}
                color="gray.100"
                fontSize="5xl"
                width="50%"
                textAlign="center"
              >
                Drop schematic file here!
              </Box>
            </Flex>
          </Box>
        ) : null}
        <Tabs.List flexShrink={0}>
          <Flex width="100%" alignItems="center" justifyContent="space-between">
            <Flex alignItems="center">
              <Tabs.Trigger value="schematic" marginRight="0.5em">
                Schematic
              </Tabs.Trigger>
              <Tabs.Trigger
                value="simulate"
                marginRight="0.5em"
                disabled={!isSimulateTabEnabled}
                style={{
                  opacity: isSimulateTabEnabled ? 1 : 0.5,
                  cursor: isSimulateTabEnabled ? "pointer" : "not-allowed",
                }}
              >
                Simulate
              </Tabs.Trigger>
              <Tabs.Trigger
                value="plot"
                marginRight="0.5em"
                disabled={!isPlotTabEnabled}
                style={{
                  opacity: isPlotTabEnabled ? 1 : 0.5,
                  cursor: isPlotTabEnabled ? "pointer" : "not-allowed",
                }}
              >
                Plot
              </Tabs.Trigger>
            </Flex>

            {/* Save button and Input Profile Toggle Button */}
            <Flex alignItems="center" gap={2}>
              {/* Save File Button */}
              <Tooltip
                showArrow
                content="Save complete EEcircuit file with schematic and simulation configurations"
                positioning={{ placement: "bottom" }}
              >
                <IconButton
                  aria-label="Save EEcircuit file"
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveFile}
                >
                  <Download size={16} />
                </IconButton>
              </Tooltip>

              {/* Input Profile Toggle Button */}
              <Tooltip
                showArrow
                content={`Switch to ${inputProfile === "mouse" ? "trackpad" : "mouse"} input profile`}
                positioning={{ placement: "bottom" }}
              >
                <IconButton
                  aria-label={`Switch to ${inputProfile === "mouse" ? "trackpad" : "mouse"} input profile`}
                  size="sm"
                  variant="ghost"
                  onClick={handleInputProfileToggle}
                >
                  {inputProfile === "mouse" ? (
                    <Mouse size={16} />
                  ) : (
                    <Touchpad size={16} />
                  )}
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
        </Tabs.List>

        <Tabs.Content value="schematic" flex={1} minHeight={0}>
          <Schematic
            onNetlistExported={exportedNetlist}
            shouldFitToScreen={shouldFitToScreen}
            onCanvasResized={handleCanvasResized}
            onSchematicDataChange={handleSchematicDataChange}
            isPlotSelectionMode={isPlotSelectionMode}
            onPlotItemSelected={handlePlotItemSelected}
            onExitPlotSelectionMode={handleExitPlotSelectionMode}
            toBePlotted={toBePlotted}
          />
        </Tabs.Content>

        <Tabs.Content value="simulate" flex={1} minHeight={0}>
          <SimulationEditor
            netList={netList}
            onResultsObtained={handleNewResults}
            selectedSimType={selectedSimType}
            simulationConfig={simulationConfig}
            onSimulationConfigChange={handleSimulationConfigChange}
            onSwitchToSchematic={handleSwitchToSchematicForPlotSelection}
            toBePlotted={toBePlotted}
            onAllSimulationConfigsChange={handleAllSimulationConfigsChange}
            initialConfigs={allSimulationConfigs}
          />
        </Tabs.Content>

        <Tabs.Content value="plot" flex={1} minHeight={0}>
          <Plot results={results} />
          {/* <PlotArray
              resultArray={resultArray}
              displayData={displayData}
              colorMode={colorMode}
              sweep={sweep}
              info={info}
              progress={progress}
              threadCount={threadCount}
              setThreadCount={setThreadCountNew}
            /> */}
        </Tabs.Content>
      </Tabs.Root>
      <Toaster />
    </Box>
  );
};

export default EEcircuit;
