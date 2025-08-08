"use client";
import React, { useRef } from "react";

//const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));
//const PlotArray = React.lazy(() => import("./plotArray.tsx"));
//const DisplayBox = React.lazy(() => import("./displayBox.tsx"));

import {
  Box,
  Flex,
  Tabs,
  Text,
  IconButton,
  TabsValueChangeDetails,
  Spinner,
} from "@chakra-ui/react";

import { Toaster } from "./components/ui/toaster.tsx";
import { Tooltip } from "./components/ui/tooltip.tsx";

import Schematic from "./schematic/schematic.tsx";
import SimulationEditor from "./Simulate/simulate.tsx";
import Logo from "./logo.tsx";
import Plot from "./plot/plot.tsx";
import {
  sendCommand,
  loadSchematic,
  Schematic as SchematicType,
} from "eecircuit-schematic";
import { EEcircuitFile } from "./types/commonTypes.ts";
import { Mouse, Touchpad, Download, Smartphone, Sun, Moon } from "lucide-react";
import { useAppStore } from "./store/appStore";
import { SimulationType } from "./types/commonTypes";
import { dialogTheme } from "./styles/dialogTheme.ts";

type MainTabsValue = "schematic" | "simulate" | "plot";

const EEcircuit: React.FC = () => {
  // Use theme state from Zustand store (system preference detection and document class handling is now in the store)
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  // Use Zustand store instead of multiple useState calls
  const {
    mainTabValue,
    isSimulateTabEnabled,
    isPlotTabEnabled,
    setMainTabValue,
    shouldFitToScreen,
    setShouldFitToScreen,
    hasViewedSchematic,
    setHasViewedSchematic,
    hasResizedSinceSchematicView,
    setHasResizedSinceSchematicView,
    dragBox,
    setDragBox,
    isSchematicLoading,
    setIsSchematicLoading,
    schematicLoadingMessage,
    setSchematicLoadingMessage,
    inputProfile,
    toggleInputProfile,
    exportNetlist,
    enterPlotSelectionMode,
    setCurrentSchematic,
    allSimulationConfigs,
  } = useAppStore();

  // Ref to store promise resolver for schematic save operations (keep this as it's for async operations)
  const schematicSaveResolverRef = useRef<
    ((data: SchematicType) => void) | null
  >(null);

  // Ref for the tabs container to handle drag and drop
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Handler for schematic data changes - updated to use Zustand store
  const handleSchematicDataChange = React.useCallback(
    (schematicData: SchematicType) => {
      setCurrentSchematic(schematicData); // Store in Zustand store

      // If there's a pending save operation, resolve it with the new data
      if (schematicSaveResolverRef.current) {
        schematicSaveResolverRef.current(schematicData);
        schematicSaveResolverRef.current = null; // Clear the resolver
      }
    },
    [setCurrentSchematic]
  );

  // Handle initial schematic view (when component mounts and schematic is the default tab)
  React.useEffect(() => {
    if (mainTabValue === "schematic" && !hasViewedSchematic) {
      // Delay the fit command to ensure canvas is ready
      const timer = setTimeout(() => {
        setShouldFitToScreen(true);
        setHasViewedSchematic(true);
      }, 200); // Longer delay for initial load
      return () => clearTimeout(timer);
    }
  }, [mainTabValue, hasViewedSchematic]);

  // Reset shouldFitToScreen flag after it's been processed
  React.useEffect(() => {
    if (shouldFitToScreen) {
      const timer = setTimeout(() => {
        setShouldFitToScreen(false);
      }, 100); // Small delay to ensure the command is processed
      return () => clearTimeout(timer);
    }
  }, [shouldFitToScreen, setShouldFitToScreen]);

  // Callback when canvas is resized
  const handleCanvasResized = React.useCallback(() => {
    setHasResizedSinceSchematicView(false);
  }, [setHasResizedSinceSchematicView]);

  const exportedNetlist = React.useCallback(
    (netlist: string) => {
      exportNetlist(netlist);
    },
    [exportNetlist]
  );

  const handleMainTabValueChange = React.useCallback(
    (details: TabsValueChangeDetails) => {
      const newTabValue = details.value as MainTabsValue;

      // Prevent switching to disabled tabs
      if (newTabValue === "simulate" && !isSimulateTabEnabled) {
        return;
      }
      if (newTabValue === "plot" && !isPlotTabEnabled) {
        return;
      }

      setMainTabValue(newTabValue);

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
      setMainTabValue,
      setShouldFitToScreen,
      setHasViewedSchematic,
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

      const files = e.dataTransfer?.files;
      if (!files?.length) {
        setDragBox(false);
        return;
      }

      const file = files[0];

      // Validate file type
      if (!isValidSchematicFile(file)) {
        console.warn(
          "Invalid file type dropped. Please drop a valid schematic file."
        );
        setDragBox(false);
        return;
      }

      try {
        // Switch to schematic tab if not already there
        if (mainTabValue !== "schematic") {
          setMainTabValue("schematic");
        }

        // Batch all state changes together for faster rendering
        setDragBox(false);
        setIsSchematicLoading(true);
        setSchematicLoadingMessage("Processing file...");

        const content = await file.text();
        const parsedContent: EEcircuitFile = JSON.parse(content);

        // check the schema version is correct
        if (parsedContent.schema !== "EEcircuitV1") {
          console.error(
            "Invalid schema version. Please drop a valid EEcircuit file."
          );
          setDragBox(false);
          setIsSchematicLoading(false);
          return;
        }

        if (parsedContent.schematic) {
          setSchematicLoadingMessage("Loading schematic...");

          // Ensure minimum loading time for better UX (run both operations in parallel)
          await Promise.all([
            loadSchematic(parsedContent.schematic),
            new Promise((resolve) => setTimeout(resolve, 400)), // Minimum 400ms visible time
          ]);

          setIsSchematicLoading(false);
        }

        // Restore simulation configurations if they exist
        if (parsedContent.simulations && parsedContent.simulations.length > 0) {
          // For now, load the first simulation configuration as the active one
          // In the future, this could be enhanced to load all configurations
          const firstSimConfig = parsedContent.simulations[0];
          // Use the store actions to update simulation state
          const {
            setSelectedSimType,
            setSimulationConfig,
            setAllSimulationConfigs,
          } = useAppStore.getState();
          setSelectedSimType(firstSimConfig.type);
          setSimulationConfig(firstSimConfig);
          setAllSimulationConfigs(parsedContent.simulations);
        } else {
          // Reset simulation config if no simulation data in file
          const { setSelectedSimType, setSimulationConfig } =
            useAppStore.getState();
          setSimulationConfig(undefined);
          setSelectedSimType("None");
        }
      } catch (error) {
        console.error("Failed to load schematic from dropped file:", error);
        setDragBox(false);
        setIsSchematicLoading(false);
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
  }, [
    setDragBox,
    setIsSchematicLoading,
    setSchematicLoadingMessage,
    mainTabValue,
    setMainTabValue,
  ]); // Include all dependencies

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
      if (mainTabValue !== "schematic") {
        setMainTabValue("schematic");
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
        (config: SimulationType) => config.type !== "None"
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
  }, [
    allSimulationConfigs,
    mainTabValue,
    waitForSchematicExport,
    setMainTabValue,
  ]); // Added setMainTabValue

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
        value={mainTabValue}
        onValueChange={handleMainTabValueChange}
        variant="subtle"
        display={"flex"}
        flexDirection="column"
        flex={1}
        minHeight={0}
        position="relative"
      >
        {dragBox ? (
          <Box
            bg="blue.focusRing/80"
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
                color="gray.solid"
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

            {/* Save button, Dark Mode Toggle, and Input Profile Toggle Button */}
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

              {/* Dark Mode Toggle Button */}
              <Tooltip
                showArrow
                content="Toggle light/dark mode"
                positioning={{ placement: "bottom" }}
              >
                <IconButton
                  aria-label="Toggle color mode"
                  size="sm"
                  variant="ghost"
                  onClick={toggleTheme}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </IconButton>
              </Tooltip>

              {/* Input Profile Toggle Button */}
              <Tooltip
                showArrow
                content={`Current: ${inputProfile} - Click to cycle input profiles`}
                positioning={{ placement: "bottom" }}
              >
                <IconButton
                  aria-label={`Current input profile: ${inputProfile} - Click to cycle`}
                  size="sm"
                  variant="ghost"
                  onClick={toggleInputProfile}
                >
                  {inputProfile === "mouse" ? (
                    <Mouse size={16} />
                  ) : inputProfile === "trackpad" ? (
                    <Touchpad size={16} />
                  ) : (
                    <Smartphone size={16} />
                  )}
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
        </Tabs.List>

        <Tabs.Content
          value="schematic"
          flex={1}
          minHeight={0}
          position="relative"
        >
          <Schematic
            onNetlistExported={exportedNetlist}
            onCanvasResized={handleCanvasResized}
            onSchematicDataChange={handleSchematicDataChange}
          />
          {isSchematicLoading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg={dialogTheme.bg}
              backdropFilter={dialogTheme.backdropFilter}
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={10000}
            >
              <Flex
                align="center"
                justify="center"
                direction="column"
                gap={4}
                bg="white"
                p={6}
                borderRadius="md"
                boxShadow="lg"
              >
                <Spinner size="xl" />
                <Text>{schematicLoadingMessage}</Text>
              </Flex>
            </Box>
          )}
        </Tabs.Content>

        <Tabs.Content value="simulate" flex={1} minHeight={0}>
          <SimulationEditor
            netList={useAppStore.getState().netList}
            onSwitchToSchematic={enterPlotSelectionMode}
          />
        </Tabs.Content>

        <Tabs.Content value="plot" flex={1} minHeight={0}>
          <Plot results={useAppStore.getState().results} />
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
