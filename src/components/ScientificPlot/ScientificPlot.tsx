import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flex, VStack, HStack, Button, Text, Box } from "@chakra-ui/react";
import PlotCanvas from "./plotcanvas/plotCanvas";
import PlotSidebar from "./PlotSidebar";
import BracketOperationSlider from "./BracketOperationSlider";
import { exportResultsToCSV } from "./utils/csvExport";
import type { ZoomController } from "./plotcanvas/interactions/zoomController";
import type { UnifiedLinePlot } from "webgl-plot";
import { ScientificPlotProps } from "./types";

const ScientificPlot: React.FC<ScientificPlotProps> = ({
  results,
  config, // Controlled source of truth
  onExportCSV,
  inputProfile = "mouse",
  isDarkMode = false,
  isBracketOperationPlot = false,
  bracketOperationResults,
  // New props with defaults
  canvas1Title = "Plot 1",
  canvas2Title = "Plot 2",
  canvas1Filter,
  canvas2Filter,
  lockNumCanvases = false,
  onConfigChange,
  lineThickness: initialLineThickness = 1,
}) => {
  // Destructure config for easier usage
  const {
    numCanvases = 1,
    isLogX = false,
    isLogY = false,
    isLogY1 = false,
    isLogY2 = false,
    selectedVariables = [],
    canvas1SelectedVariables = [],
    canvas2SelectedVariables = [],
    lineThickness = initialLineThickness,
  } = config;

  // -- INTERNAL STATE --
  // We only keep state for things that are TRULY internal and transient (like hover or cursor position)

  // Single canvas interaction state
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);

  // Dual canvas interaction state
  const [canvas1HoveredVariable, setCanvas1HoveredVariable] = useState<string | null>(null);
  const [canvas2HoveredVariable, setCanvas2HoveredVariable] = useState<string | null>(null);

  // Shared UI state
  const [sharedCursorX, setSharedCursorX] = useState<number | null>(null);
  const [sharedCursorVisible, setSharedCursorVisible] = useState(false);
  const [isDrawerPinned, setIsDrawerPinned] = useState(false);
  const [emphasizedPlotIndex, setEmphasizedPlotIndex] = useState(0);

  // Shared Axis/Zoom State
  const [sharedXAxisScale, setSharedXAxisScale] = useState<{
    scaleX: number;
    offsetX: number;
    sourceCanvas: 1 | 2;
    timestamp: number;
  } | null>(null);
  
  const [sharedZoomState, setSharedZoomState] = useState<{
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  } | null>(null);


  // Refs
  const canvas1PlotLineRef = useRef<UnifiedLinePlot | null>(null);
  const canvas2PlotLineRef = useRef<UnifiedLinePlot | null>(null);
  const canvas1ZoomControllerRef = useRef<ZoomController | null>(null);
  const canvas2ZoomControllerRef = useRef<ZoomController | null>(null);
  const canvas1PlotUpdateRef = useRef<(() => void) | null>(null);
  const canvas2PlotUpdateRef = useRef<(() => void) | null>(null);
  const canvas1PlotScalingRef = useRef<(() => void) | null>(null);
  const canvas2PlotScalingRef = useRef<(() => void) | null>(null);

  // -- AUTO SELECTION LOGIC --
  // We use a ref to track the previous variable signature to decide when to reset selections.
  // This replaces the render-time state update pattern with a controlled side-effect.
  const prevInputLineNamesRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (results.length > 0 && results[0]?.variableNames) {
      const inputLineNames = results[0].variableNames.slice(1);
      const currentInputLineNamesJson = JSON.stringify(inputLineNames);
      const prevInputLineNamesJson = JSON.stringify(prevInputLineNamesRef.current);

      if (currentInputLineNamesJson !== prevInputLineNamesJson) {
        // Variable signature changed! Update ref and trigger config change.
        prevInputLineNamesRef.current = inputLineNames;
        
        if (onConfigChange) {
             const updates: Partial<typeof config> = {};
             
             // logic to determine default selections
             // We can check the CURRENT numCanvases from props to decide what to populate
             // But usually we just want to populate EVERYTHING so it's ready for any mode switch
             
             // 1. Single Canvas Defaults
             updates.selectedVariables = inputLineNames;

             // 2. Dual Canvas Defaults
             if (canvas1Filter) {
                updates.canvas1SelectedVariables = inputLineNames.filter(canvas1Filter);
             } else {
                updates.canvas1SelectedVariables = inputLineNames;
             }

             if (canvas2Filter) {
                updates.canvas2SelectedVariables = inputLineNames.filter(canvas2Filter);
             } else {
                updates.canvas2SelectedVariables = inputLineNames;
             }
             
             onConfigChange(updates);
        }
      }
    }
  }, [results, onConfigChange, canvas1Filter, canvas2Filter]);


  // -- HANDLERS --
  // These now update the PARENT via onConfigChange instead of local state

  const handleUpdateConfig = useCallback((updates: Partial<typeof config>) => {
    if (onConfigChange) {
      onConfigChange(updates);
    }
  }, [onConfigChange]);

  const handleCanvas1XAxisScaleChange = useCallback(
    (scale: { scaleX: number; offsetX: number }) => {
      setSharedXAxisScale({ ...scale, sourceCanvas: 1, timestamp: Date.now() });
    }, []
  );

  const handleCanvas2XAxisScaleChange = useCallback(
    (scale: { scaleX: number; offsetX: number }) => {
      setSharedXAxisScale({ ...scale, sourceCanvas: 2, timestamp: Date.now() });
    }, []
  );

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV(results);
    } else {
      exportResultsToCSV(results);
    }
  };

  const handleLogXToggle = useCallback(() => {
    const newIsLogX = !isLogX;
    
    // Imperative update for immediate feedback in dual mode (Optional but good for UX)
    if (numCanvases === 2) {
       canvas1PlotLineRef.current?.setLogAxis(newIsLogX, isLogY1);
       canvas1PlotLineRef.current?.autoScale();
       canvas1PlotLineRef.current?.draw();
       
       canvas2PlotLineRef.current?.setLogAxis(newIsLogX, isLogY2);
       canvas2PlotLineRef.current?.autoScale();
       canvas2PlotLineRef.current?.draw();
    }
    
    // Notify Parent
    handleUpdateConfig({ isLogX: newIsLogX });
  }, [isLogX, isLogY1, isLogY2, numCanvases, handleUpdateConfig]);


  return (
    <Flex direction="column" w="100%" h="100%" overflow="hidden" position="relative">
      {/* Bracket Operation Slider */}
      {isBracketOperationPlot && bracketOperationResults && (
        <BracketOperationSlider
          bracketOperationResults={bracketOperationResults}
          emphasizedPlotIndex={emphasizedPlotIndex}
          onEmphasizedPlotIndexChange={setEmphasizedPlotIndex}
        />
      )}

      <Flex direction="row" w="100%" flex="1" gap={4} p={4} overflow="hidden" position="relative">
        <VStack
          flex="1"
          minW="0"
          minHeight={0}
          marginRight={{ base: 0, md: isDrawerPinned ? "12rem" : 0 }}
          transition="margin-right 0.3s ease"
          gap={4}
        >
             {/* Controls */}
             <HStack gap={4} alignSelf="flex-start">
            {!lockNumCanvases && (
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">Mode:</Text>
                <Button size="sm" variant={numCanvases === 1 ? "solid" : "outline"} onClick={() => handleUpdateConfig({ numCanvases: 1 })}>Single</Button>
                <Button size="sm" variant={numCanvases === 2 ? "solid" : "outline"} onClick={() => handleUpdateConfig({ numCanvases: 2 })}>Dual</Button>
              </HStack>
            )}

            <HStack gap={2}>
              <Text fontSize="sm" color="fg.muted">Cursor:</Text>
              <Button size="sm" variant={sharedCursorVisible ? "solid" : "outline"} onClick={() => setSharedCursorVisible(!sharedCursorVisible)}>
                {sharedCursorVisible ? "Hide" : "Show"}
              </Button>
            </HStack>

            <HStack gap={2}>
              <Text fontSize="sm" color="fg.muted">Scale:</Text>
              <Button size="sm" variant={isLogX ? "solid" : "outline"} onClick={handleLogXToggle} aria-pressed={isLogX}>Log X</Button>
              {numCanvases === 1 ? (
                <Button size="sm" variant={isLogY ? "solid" : "outline"} onClick={() => handleUpdateConfig({ isLogY: !isLogY })} aria-pressed={isLogY}>Log Y</Button>
              ) : (
                <>
                  <Button size="sm" variant={isLogY1 ? "solid" : "outline"} onClick={() => handleUpdateConfig({ isLogY1: !isLogY1 })} aria-pressed={isLogY1}>Log Y1</Button>
                  <Button size="sm" variant={isLogY2 ? "solid" : "outline"} onClick={() => handleUpdateConfig({ isLogY2: !isLogY2 })} aria-pressed={isLogY2}>Log Y2</Button>
                </>
              )}
            </HStack>
          </HStack>

          {/* Canvas Rendering */}
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
                 inputProfile={inputProfile}
                 isDarkMode={isDarkMode}
                 emphasizedPlotIndex={emphasizedPlotIndex}
                 isLogX={isLogX}
                 isLogY={isLogY}
                  canvasId={1} // Just 1 as default
                  lineThickness={lineThickness}
                />
             </Box>
          )}

          {numCanvases === 2 && (
            <VStack flex="1" w="100%" minH="0" gap={4}>
               {/* Canvas 1 */}
               <VStack flex="1" w="100%" minH="0" gap={1}>
                  <Text fontSize="sm" fontWeight="medium" alignSelf="flex-start" color="fg.muted">
                    {canvas1Title}
                  </Text>
                  <Box flex="1" w="100%" minH="0">
                    <PlotCanvas
                      results={results}
                      selectedVariables={canvas1SelectedVariables}
                      hoveredVariable={canvas1HoveredVariable}
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
                      sharedXAxisScale={sharedXAxisScale?.sourceCanvas === 2 ? sharedXAxisScale : null}
                      onXAxisScaleChange={handleCanvas1XAxisScaleChange}
                      plotLineRef={canvas1PlotLineRef}
                      canvasId={1}
                      inputProfile={inputProfile}
                      isDarkMode={isDarkMode}
                      emphasizedPlotIndex={emphasizedPlotIndex}
                      isLogX={isLogX}
                      isLogY={isLogY1}
                      lineThickness={lineThickness}
                    />
                  </Box>
               </VStack>

               {/* Canvas 2 */}
               <VStack flex="1" w="100%" minH="0" gap={1}>
                  <Text fontSize="sm" fontWeight="medium" alignSelf="flex-start" color="fg.muted">
                    {canvas2Title}
                  </Text>
                  <Box flex="1" w="100%" minH="0">
                    <PlotCanvas
                      results={results}
                      selectedVariables={canvas2SelectedVariables}
                      hoveredVariable={canvas2HoveredVariable}
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
                      sharedXAxisScale={sharedXAxisScale?.sourceCanvas === 1 ? sharedXAxisScale : null}
                      onXAxisScaleChange={handleCanvas2XAxisScaleChange}
                      plotLineRef={canvas2PlotLineRef}
                      canvasId={2}
                      inputProfile={inputProfile}
                      isDarkMode={isDarkMode}
                      emphasizedPlotIndex={emphasizedPlotIndex}
                      isLogX={isLogX}
                      isLogY={isLogY2}
                      lineThickness={lineThickness}
                    />
                  </Box>
               </VStack>
            </VStack>
          )}

        </VStack>

        {/* Sidebar */}
        {results.length > 0 && results[0]?.variableNames && (
          <PlotSidebar
            variableNames={results[0].variableNames}
            selectedVariables={numCanvases === 1 ? selectedVariables : canvas1SelectedVariables}
            onSelectedVariablesChange={(vars) => numCanvases === 1 
              ? handleUpdateConfig({ selectedVariables: vars }) 
              : handleUpdateConfig({ canvas1SelectedVariables: vars })
            }
            hoveredVariable={numCanvases === 1 ? hoveredVariable : canvas1HoveredVariable}
            onVariableHover={numCanvases === 1 ? setHoveredVariable : setCanvas1HoveredVariable}
            onPinnedChange={setIsDrawerPinned}
            onExportCSV={handleExportCSV}
            numCanvases={numCanvases}
            canvas2SelectedVariables={canvas2SelectedVariables}
            onCanvas2SelectedVariablesChange={(vars) => handleUpdateConfig({ canvas2SelectedVariables: vars })}
            canvas2HoveredVariable={canvas2HoveredVariable}
            onCanvas2VariableHover={setCanvas2HoveredVariable}
            canvas1Title={canvas1Title}
            canvas2Title={canvas2Title}
            canvas1AvailableVariables={canvas1Filter && results[0]?.variableNames ? results[0].variableNames.slice(1).filter(canvas1Filter) : undefined}
            canvas2AvailableVariables={canvas2Filter && results[0]?.variableNames ? results[0].variableNames.slice(1).filter(canvas2Filter) : undefined}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default ScientificPlot;
