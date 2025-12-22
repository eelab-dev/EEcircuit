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
  TabsValueChangeDetails,
  Spinner,
  Skeleton,
} from "@chakra-ui/react";

import { Toaster } from "./components/ui/toaster.tsx";

import Logo from "./logo.tsx";
import {
  sendCommand,
  loadSchematic,
  Schematic as SchematicType,
} from "eecircuit-schematic";
import { EEcircuitFile } from "./types/commonTypes.ts";
import type { AggregatedResult, PlotConfig } from "./components/ScientificPlot/types";
import { useAppStore } from "./store/appStore";
import { SimulationType } from "./types/commonTypes";
import { dialogTheme } from "./styles/uiThemes.ts";
import { handleFullscreen } from "./utils/fullscreenUtils.tsx";

const loadSchematicComponent = () => import("./schematic/schematic.tsx");
const Schematic = React.lazy(loadSchematicComponent);

const loadSimulationEditorComponent = () => import("./Simulate/simulate.tsx");
const SimulationEditor = React.lazy(loadSimulationEditorComponent);

const loadPlotComponent = () =>
  import("./components/ScientificPlot").then((module) => ({
    default: module.ScientificPlot,
  }));
const Plot = React.lazy(loadPlotComponent);

import PlotProgressOverlay from "./components/PlotProgressOverlay";

const loadHeaderButtons = () => import("./components/HeaderButtons");
const HeaderButtons = React.lazy(loadHeaderButtons);

const loadClearSchematicDialog = () => import("./schematic/ClearSchematicDialog");
const ClearSchematicDialog = React.lazy(loadClearSchematicDialog);

const loadSettingsDialog = () => import("./components/Settings/SettingsDialog");
const SettingsDialog = React.lazy(loadSettingsDialog);

const TabPanelSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <Flex
    flex={1}
    minHeight={0}
    alignItems="center"
    justifyContent="center"
    bg="bg.subtle"
  >
    <Box
      w={{ base: "90%", md: "70%" }}
      maxW="720px"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="xl"
      p={{ base: 4, md: 8 }}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Skeleton height="20px" width="40%" borderRadius="md" />
      <Skeleton
        height={{ base: "160px", md: "220px" }}
        borderRadius="lg"
      />
      <Text color="fg.subtle" textAlign="center">
        Preparing {label}...
      </Text>
    </Box>
  </Flex>
);

const HeaderButtonsSkeleton: React.FC<{ wrap?: boolean }> = ({ wrap }) => (
  <Flex
    alignItems="center"
    justifyContent={wrap ? "center" : "flex-end"}
    gap={wrap ? 2 : 3}
    flexWrap={wrap ? "wrap" : "nowrap"}
    width={wrap ? "100%" : "auto"}
  >
    <Skeleton height="36px" width="36px" borderRadius="md" />
    <Skeleton height="36px" width="120px" borderRadius="md" />
    <Skeleton height="36px" width="120px" borderRadius="md" />
    <Skeleton height="36px" width="120px" borderRadius="md" />
  </Flex>
);

type MainTabsValue = "schematic" | "simulate" | "plot";

const EEcircuitApp: React.FC = () => {
  // Use theme state from Zustand store (system preference detection and document class handling is now in the store)
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  // Fullscreen state
  const [fullscreen, setFullscreen] = React.useState(false);

  // Clear schematic dialog state
  const [showClearDialog, setShowClearDialog] = React.useState(false);

  // Simulation config dialog state
  const [showConfigDialog, setShowConfigDialog] = React.useState(false);

  // Preload heavier modules after first paint to improve perceived load on slow devices
  React.useEffect(() => {
    void loadSimulationEditorComponent();
    void loadPlotComponent();

    const warmLazyDependencies = () => {
      void loadHeaderButtons();
      void loadClearSchematicDialog();
      void loadSettingsDialog();
    };

    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        idleHandle = (
          window as Window & {
            requestIdleCallback: (
              callback: IdleRequestCallback,
              options?: IdleRequestOptions
            ) => number;
            cancelIdleCallback: (handle: number) => void;
          }
        ).requestIdleCallback(() => {
          warmLazyDependencies();
        });
      } else {
        timeoutHandle = globalThis.setTimeout(warmLazyDependencies, 300);
      }
    }

    return () => {
      if (idleHandle !== undefined && typeof window !== "undefined") {
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(
            idleHandle
          );
        }
      }
      if (timeoutHandle !== undefined) {
        globalThis.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  // Listen for fullscreen changes from browser/keyboard
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
    enterToBePlottedMode,
    setCurrentSchematic,
    allSimulationConfigs,
    results, // Get reactive results for ScientificPlot
    
    // Bracket operation State
    isBracketOperationPlot,
    bracketOperationResults,
    
    // Plot configuration state
    isLogX, isLogY, isLogY1, isLogY2, numCanvases,
    selectedVariables, canvas1SelectedVariables, canvas2SelectedVariables,
    lineThickness,
    updatePlotConfig,
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
    return undefined;
  }, [
    mainTabValue,
    hasViewedSchematic,
    setHasViewedSchematic,
    setShouldFitToScreen,
  ]);

  // Reset shouldFitToScreen flag after it's been processed
  React.useEffect(() => {
    if (shouldFitToScreen) {
      const timer = setTimeout(() => {
        setShouldFitToScreen(false);
      }, 100); // Small delay to ensure the command is processed
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup for other paths
  }, [shouldFitToScreen, setShouldFitToScreen]);

  // Callback when canvas is resized
  const handleCanvasResized = React.useCallback(() => {
    setHasResizedSinceSchematicView(false);
  }, [setHasResizedSinceSchematicView]);

  // Deprecated: netlist flow now handled within Schematic via ee.getNetList().

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

  // Reusable validator for schematic files
  const isValidSchematicFile = React.useCallback((file: File): boolean => {
    return (
      file.type === "application/json" ||
      file.type === "text/plain" ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".txt")
    );
  }, []);

  // Unified file processing used by both drag-and-drop and the Open button
  const processSchematicFile = React.useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type
      if (!isValidSchematicFile(file)) {
        console.warn(
          "[DEBUG:open-file] Invalid file type. Please select a valid schematic file."
        );
        setDragBox(false);
        return;
      }

      try {
        // Switch to schematic tab if not already there
        if (mainTabValue !== "schematic") {
          setMainTabValue("schematic");
        }

        // Batch state changes for smoother UI
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
          const firstSimConfig = parsedContent.simulations[0];
          if (firstSimConfig) {
            const {
              setSelectedSimType,
              setSimulationConfig,
              setAllSimulationConfigs,
            } = useAppStore.getState();

            // First load all configurations
            setAllSimulationConfigs(parsedContent.simulations);

            // Then select the first one as active
            setSelectedSimType(firstSimConfig.type);
            setSimulationConfig(firstSimConfig);
          }
        } else {
          // Reset simulation config if no simulation data in file
          const {
            setSelectedSimType,
            setSimulationConfig,
            setAllSimulationConfigs,
          } = useAppStore.getState();
          setAllSimulationConfigs([]);
          setSimulationConfig(undefined);
          setSelectedSimType("None");
        }
      } catch (error) {
        console.error("Failed to load schematic from file:", error);
        setDragBox(false);
        setIsSchematicLoading(false);
        alert(
          "Failed to load schematic file. Please ensure the file is valid."
        );
      }
    },
    [
      isValidSchematicFile,
      mainTabValue,
      setMainTabValue,
      setDragBox,
      setIsSchematicLoading,
      setSchematicLoadingMessage,
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
      if (!file) {
        setDragBox(false);
        return;
      }
      await processSchematicFile(file);
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
    processSchematicFile,
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

  // Fullscreen handler using the utility module
  const fullscreenHandler = React.useCallback(async () => {
    await handleFullscreen(fullscreen);
  }, [fullscreen]);

  // Clear schematic dialog handlers
  const handleCloseClearDialog = React.useCallback(() => {
    setShowClearDialog(false);
  }, []);

  // Plot configuration handler
  const handlePlotConfigChange = React.useCallback(
    (config: Partial<PlotConfig>) => {
      // console.log("[EEcircuitApp] handlePlotConfigChange:", config);
      updatePlotConfig(config);
    },
    [updatePlotConfig]
  );
  
  // Calculate plot configuration based on current state & results
  const firstResult = results.length > 0 ? (results[0] as unknown as { type?: string, dataType?: string }) : null;
  const isAC = firstResult && (
    firstResult.type?.toLowerCase() === "ac" || 
    firstResult.dataType === "complex"
  );
  
  const plotProps = isAC ? {
    initialConfig: {
      numCanvases: numCanvases as 1 | 2,
      isLogX,
      isLogY1,
      isLogY2,
      selectedVariables, canvas1SelectedVariables, canvas2SelectedVariables,
      lineThickness,
    },
    canvas1Title: "Magnitude",
    canvas2Title: "Phase",
    canvas2Filter: (v: string) => v.toLowerCase().includes("[phase]"),
    lockNumCanvases: true,
    lineThickness,
  } : {
     initialConfig: {
       numCanvases: numCanvases as 1 | 2,
       isLogX,
       isLogY,
        selectedVariables, canvas1SelectedVariables, canvas2SelectedVariables,
        lineThickness,
      },
      lineThickness,
  };

  return (
    <Box
      border="solid 0px"
      p={2}
      height={"100vh"}
      display={"flex"}
      flexDirection={"column"}
      overflow="hidden"
    >
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
        {/* Header - Responsive Layout */}
        {/* Desktop Layout: Logo | Tabs | Buttons */}
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexShrink={0}
          p={2}
          display={{ base: "none", md: "flex" }}
        >
          <Logo />

          {/* Tabs in the center */}
          <Flex alignItems="center">
            <Tabs.Trigger value="schematic" marginX="0.5em">
              Schematic
            </Tabs.Trigger>
            <Tabs.Trigger
              value="simulate"
              marginX="0.5em"
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
              marginX="0.5em"
              disabled={!isPlotTabEnabled}
              style={{
                opacity: isPlotTabEnabled ? 1 : 0.5,
                cursor: isPlotTabEnabled ? "pointer" : "not-allowed",
              }}
            >
              Plot
            </Tabs.Trigger>
          </Flex>

          {/* Buttons on the right */}
          <React.Suspense fallback={<HeaderButtonsSkeleton />}>
            <HeaderButtons
              handleSaveFile={handleSaveFile}
              onOpenFile={processSchematicFile}
              setShowClearDialog={setShowClearDialog}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              inputProfile={inputProfile}
              toggleInputProfile={toggleInputProfile}
              fullscreen={fullscreen}
              fullscreenHandler={fullscreenHandler}
              setShowConfigDialog={setShowConfigDialog}
            />
          </React.Suspense>
        </Flex>

        {/* Mobile Layout: Stacked */}
        <Box display={{ base: "block", md: "none" }} flexShrink={0} p={2}>
          {/* Top row: Buttons */}
          <Flex
            alignItems="center"
            justifyContent="center"
            gap={1}
            mb={3}
            flexWrap="wrap"
          >
            <React.Suspense fallback={<HeaderButtonsSkeleton wrap />}> 
              <HeaderButtons
                handleSaveFile={handleSaveFile}
                onOpenFile={processSchematicFile}
                setShowClearDialog={setShowClearDialog}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                inputProfile={inputProfile}
                toggleInputProfile={toggleInputProfile}
                fullscreen={fullscreen}
                fullscreenHandler={fullscreenHandler}
                setShowConfigDialog={setShowConfigDialog}
              />
            </React.Suspense>
          </Flex>

          {/* Bottom row: Logo and Tabs */}
          <Flex alignItems="center" justifyContent="center" gap={4}>
            <Logo />
            <Flex alignItems="center" gap={2}>
              <Tabs.Trigger value="schematic">Schematic</Tabs.Trigger>
              <Tabs.Trigger
                value="simulate"
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
                disabled={!isPlotTabEnabled}
                style={{
                  opacity: isPlotTabEnabled ? 1 : 0.5,
                  cursor: isPlotTabEnabled ? "pointer" : "not-allowed",
                }}
              >
                Plot
              </Tabs.Trigger>
            </Flex>
          </Flex>
        </Box>
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

        <Tabs.Content
          value="schematic"
          flex={1}
          minHeight={0}
          position="relative"
        >
          <React.Suspense fallback={<TabPanelSkeleton label="schematic workspace" />}>
            <Schematic
              onCanvasResized={handleCanvasResized}
              onSchematicDataChange={handleSchematicDataChange}
            />
          </React.Suspense>
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
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
                gap={4}
                bg="bg"
                color="fg"
                p={6}
                borderRadius="lg"
                boxShadow="lg"
                borderWidth={dialogTheme.borderWidth}
                borderColor={dialogTheme.borderColor}
                minW={{ base: "260px", md: "320px" }}
              >
                <Spinner size="xl" color="fg" />
                <Text color="fg">{schematicLoadingMessage}</Text>
              </Box>
            </Box>
          )}
        </Tabs.Content>

        <Tabs.Content value="simulate" flex={1} minHeight={0} display="flex">
          <React.Suspense fallback={<TabPanelSkeleton label="simulation workspace" />}>
            <SimulationEditor onSwitchToSchematic={enterToBePlottedMode} />
          </React.Suspense>
        </Tabs.Content>

        <Tabs.Content value="plot" flex={1} minHeight={0} display="flex">
          <React.Suspense fallback={<TabPanelSkeleton label="the plot viewer" />}>
            <Plot
              key={firstResult ? (firstResult.type || firstResult.dataType || "default") : "empty"}
              results={results}
              inputProfile={inputProfile}
              isDarkMode={isDarkMode}
              isBracketOperationPlot={isBracketOperationPlot}
              bracketOperationResults={bracketOperationResults as unknown as AggregatedResult}
              onConfigChange={handlePlotConfigChange}
              {...plotProps}
            />
            <PlotProgressOverlay />
          </React.Suspense>
        </Tabs.Content>
      </Tabs.Root>

      {/* Clear Schematic Confirmation Dialog */}
      <React.Suspense fallback={null}>
        <ClearSchematicDialog
          isOpen={showClearDialog}
          onClose={handleCloseClearDialog}
        />
      </React.Suspense>

      {/* Simulation Configuration Dialog */}
      <React.Suspense fallback={null}>
        {showConfigDialog && (
          <SettingsDialog
            open={showConfigDialog}
            onClose={() => setShowConfigDialog(false)}
          />
        )}
      </React.Suspense>

      <Toaster />
    </Box>
  );
};

export default EEcircuitApp;
