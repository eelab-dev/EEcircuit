import React from "react";
import { ResultType } from "eecircuit-engine";
import { Flex, VStack, HStack, Button, Text, Box } from "@chakra-ui/react";
import PlotCanvas from "./plotcanvas/plotCanvas";
import PlotSidebar from "./plotSidebar";
import BracketOperationSlider from "./BracketOperationSlider";
import { useAppStore } from "../store/appStore";
import { exportResultsToCSV } from "../utils/csvExport";
import type { ZoomController } from "./plotcanvas/interactions/zoomController";

interface PlotProps {
  results?: ResultType[]; // Make optional since we can get it from store
}

const Plot: React.FC<PlotProps> = ({ results: propsResults }) => {
  // Use Zustand store for plot state
  const storeResults = useAppStore((state) => state.results);

  // Multi-canvas state from store
  const numCanvases = useAppStore((state) => state.numCanvases);
  const isACModeActive = useAppStore((state) => state.isACModeActive);
  const setNumCanvases = useAppStore((state) => state.setNumCanvases);

  // Bracket operation state from store
  const isBracketOperationPlot = useAppStore((state) => state.isBracketOperationPlot);
  const bracketOperationResults = useAppStore((state) => state.bracketOperationResults);
  

  // IMPORTANT: Checkbox State Management Pattern
  // ==========================================
  // Use LOCAL React state for all checkbox selections - NOT Zustand store state!
  // 
  // Problem: Chakra UI's CheckboxGroup has synchronization issues with Zustand store state.
  // When selectedVariables comes from a Zustand store, checkboxes don't update their visual 
  // state properly when clicked, even though the store state changes correctly.
  //
  // Solution: Always use React's useState for checkbox management. This pattern was 
  // discovered in commit 0f72fe2 and must be maintained for all checkbox functionality.
  //
  // For future developers: If you need to add more checkbox groups, always use local
  // React state and pass the values through props. Do NOT use Zustand store state directly
  // in CheckboxGroup value/onValueChange props.

  // Single canvas mode state
  const [selectedVariables, setSelectedVariables] = React.useState<string[]>(
    []
  );
  const [hoveredVariable, setHoveredVariable] = React.useState<string | null>(
    null
  );
  
  // Dual canvas mode - separate local state for each canvas (avoids Zustand sync issues)
  const [localCanvas1SelectedVariables, setLocalCanvas1SelectedVariables] = React.useState<string[]>([]);
  const [localCanvas1HoveredVariable, setLocalCanvas1HoveredVariable] = React.useState<string | null>(null);
  const [localCanvas2SelectedVariables, setLocalCanvas2SelectedVariables] = React.useState<string[]>([]);
  const [localCanvas2HoveredVariable, setLocalCanvas2HoveredVariable] = React.useState<string | null>(null);
  
  // Shared cursor state for dual canvas synchronization - only X coordinate matters
  const [sharedCursorX, setSharedCursorX] = React.useState<number | null>(null);
  const [sharedCursorVisible, setSharedCursorVisible] = React.useState(false);
  
  // Shared zoom state for dual canvas synchronization
  const [sharedZoomState, setSharedZoomState] = React.useState<{
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  } | null>(null);
  
  // Refs for direct pan synchronization without React state
  const canvas1ZoomControllerRef = React.useRef<ZoomController | null>(null);
  const canvas2ZoomControllerRef = React.useRef<ZoomController | null>(null);
  
  // Refs for direct plot update functions
  const canvas1PlotUpdateRef = React.useRef<(() => void) | null>(null);
  const canvas2PlotUpdateRef = React.useRef<(() => void) | null>(null);
  const canvas1PlotScalingRef = React.useRef<(() => void) | null>(null);
  const canvas2PlotScalingRef = React.useRef<(() => void) | null>(null);

  // Use results from props if provided, otherwise from store
  const results = propsResults || storeResults;

  // State for drawer pinning and visibility
  const [isDrawerPinned, setIsDrawerPinned] = React.useState(false);

  // Trigger resize when pinning state changes
  React.useEffect(() => {
    // Small delay to ensure layout has updated before triggering resize
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [isDrawerPinned]);


  // Initialize variables when results change or canvas mode changes
  React.useEffect(() => {
    if (results.length > 0 && results[0]?.variableNames) {
      const allVariables = results[0].variableNames.slice(1); // Skip first variable (time/frequency)
      
      if (numCanvases === 1) {
        // Single canvas mode - select all variables
        setSelectedVariables(allVariables);
        // Clear local canvas states when going to single mode
        setLocalCanvas1SelectedVariables([]);
        setLocalCanvas2SelectedVariables([]);
      } else if (numCanvases === 2) {
        if (isACModeActive) {
          // AC mode - separate magnitude and phase
          const magVariables = allVariables.filter(v => v.includes('[mag]'));
          const phaseVariables = allVariables.filter(v => v.includes('[phase]'));
          setLocalCanvas1SelectedVariables(magVariables);
          setLocalCanvas2SelectedVariables(phaseVariables);
        } else {
          // Manual dual mode - start with all variables in canvas 1, none in canvas 2
          setLocalCanvas1SelectedVariables(allVariables);
          setLocalCanvas2SelectedVariables([]);
        }
        // Clear single canvas state when going to dual mode
        setSelectedVariables([]);
      }
    }
  }, [results, numCanvases, isACModeActive]);

  // Variable selection initialization: select all variables except first (time/frequency)
  // by default when new results arrive. This matches the original behavior.

  const handleExportCSV = () => {
    exportResultsToCSV(results);
  };


  return (
    <Flex
      direction="column"
      w="100%"
      h="100%"
      overflow="hidden"
      position="relative"
    >
      {/* Bracket operation slider - positioned at top */}
      {isBracketOperationPlot && bracketOperationResults && (
        <BracketOperationSlider
          bracketOperationResults={bracketOperationResults}
        />
      )}
      
      <Flex
        direction="row"
        w="100%"
        flex="1"
        gap={4}
        p={4}
        overflow="hidden"
        position="relative"
      >
        <VStack 
          flex="1"
          minW="0"
          minHeight={0}
          marginRight={{ base: 0, md: isDrawerPinned ? "12rem" : 0 }}
          transition="margin-right 0.3s ease"
          gap={4}
        >
          {/* Canvas mode and cursor controls */}
          <HStack gap={4} alignSelf="flex-start">
            {!isACModeActive && (
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">Canvas mode:</Text>
                <Button
                  size="sm"
                  variant={numCanvases === 1 ? "solid" : "outline"}
                  onClick={() => setNumCanvases(1)}
                >
                  Single
                </Button>
                <Button
                  size="sm"
                  variant={numCanvases === 2 ? "solid" : "outline"}
                  onClick={() => setNumCanvases(2)}
                >
                  Dual
                </Button>
              </HStack>
            )}
            
            {/* Cursor toggle control */}
            <HStack gap={2}>
              <Text fontSize="sm" color="fg.muted">Cursor:</Text>
              <Button
                size="sm"
                variant={sharedCursorVisible ? "solid" : "outline"}
                onClick={() => setSharedCursorVisible(!sharedCursorVisible)}
              >
                {sharedCursorVisible ? "Hide" : "Show"}
              </Button>
            </HStack>
          </HStack>
          
          {/* Single canvas mode */}
          {numCanvases === 1 && (
            <Box flex="1" w="100%" minH="0">
              <PlotCanvas
                results={results}
                selectedVariables={selectedVariables}
                hoveredVariable={hoveredVariable}
                isBracketOperationPlot={isBracketOperationPlot}
                bracketOperationResults={bracketOperationResults}
                sharedCursorVisible={sharedCursorVisible}
                onCursorVisibilityChange={setSharedCursorVisible}
              />
            </Box>
          )}
          
          {/* Dual canvas mode */}
          {numCanvases === 2 && (
            <VStack flex="1" w="100%" minH="0" gap={4}>
              {/* Canvas 1 */}
              <VStack flex="1" w="100%" minH="0" gap={1}>
                <Text fontSize="sm" fontWeight="medium" alignSelf="flex-start" color="fg.muted">
                  {isACModeActive ? "Magnitude" : "Plot 1"}
                </Text>
                <Box flex="1" w="100%" minH="0">
                  <PlotCanvas
                    results={results}
                    selectedVariables={localCanvas1SelectedVariables}
                    hoveredVariable={localCanvas1HoveredVariable}
                    isBracketOperationPlot={isBracketOperationPlot}
                    bracketOperationResults={bracketOperationResults}
                    sharedCursorX={sharedCursorX}
                    onCursorXChange={setSharedCursorX}
                    sharedCursorVisible={sharedCursorVisible}
                    onCursorVisibilityChange={setSharedCursorVisible}
                    sharedZoomState={sharedZoomState}
                    onZoomStateChange={setSharedZoomState}
                    otherCanvasZoomController={canvas2ZoomControllerRef}
                    zoomControllerRef={canvas1ZoomControllerRef}
                    plotUpdateRef={canvas1PlotUpdateRef}
                    plotScalingRef={canvas1PlotScalingRef}
                    otherCanvasUpdatePlot={canvas2PlotUpdateRef}
                    otherCanvasCalcScaling={canvas2PlotScalingRef}
                  />
                </Box>
              </VStack>
              
              {/* Canvas 2 */}
              <VStack flex="1" w="100%" minH="0" gap={1}>
                <Text fontSize="sm" fontWeight="medium" alignSelf="flex-start" color="fg.muted">
                  {isACModeActive ? "Phase" : "Plot 2"}
                </Text>
                <Box flex="1" w="100%" minH="0">
                  <PlotCanvas
                    results={results}
                    selectedVariables={localCanvas2SelectedVariables}
                    hoveredVariable={localCanvas2HoveredVariable}
                    isBracketOperationPlot={isBracketOperationPlot}
                    bracketOperationResults={bracketOperationResults}
                    sharedCursorX={sharedCursorX}
                    onCursorXChange={setSharedCursorX}
                    sharedCursorVisible={sharedCursorVisible}
                    onCursorVisibilityChange={setSharedCursorVisible}
                    sharedZoomState={sharedZoomState}
                    onZoomStateChange={setSharedZoomState}
                    otherCanvasZoomController={canvas1ZoomControllerRef}
                    zoomControllerRef={canvas2ZoomControllerRef}
                    plotUpdateRef={canvas2PlotUpdateRef}
                    plotScalingRef={canvas2PlotScalingRef}
                    otherCanvasUpdatePlot={canvas1PlotUpdateRef}
                    otherCanvasCalcScaling={canvas1PlotScalingRef}
                  />
                </Box>
              </VStack>
            </VStack>
          )}
        </VStack>
        {results.length > 0 && results[0]?.variableNames && (
          <PlotSidebar
            variableNames={
              results.length > 0 ? results[0]?.variableNames || [] : []
            }
            selectedVariables={numCanvases === 1 ? selectedVariables : localCanvas1SelectedVariables}
            onSelectedVariablesChange={numCanvases === 1 ? setSelectedVariables : setLocalCanvas1SelectedVariables}
            hoveredVariable={numCanvases === 1 ? hoveredVariable : localCanvas1HoveredVariable}
            onVariableHover={numCanvases === 1 ? setHoveredVariable : setLocalCanvas1HoveredVariable}
            onPinnedChange={setIsDrawerPinned}
            onExportCSV={handleExportCSV}
            // Multi-canvas support
            numCanvases={numCanvases}
            isACModeActive={isACModeActive}
            canvas2SelectedVariables={localCanvas2SelectedVariables}
            onCanvas2SelectedVariablesChange={setLocalCanvas2SelectedVariables}
            canvas2HoveredVariable={localCanvas2HoveredVariable}
            onCanvas2VariableHover={setLocalCanvas2HoveredVariable}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default Plot;
