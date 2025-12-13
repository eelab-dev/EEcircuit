import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flex, VStack, HStack, Button, Text, Box } from "@chakra-ui/react";
import PlotCanvas from "./plotcanvas/plotCanvas";
import PlotSidebar from "./PlotSidebar";
import BracketOperationSlider from "./BracketOperationSlider";
import { exportResultsToCSV } from "./utils/csvExport";
import type { ZoomController } from "./plotcanvas/interactions/zoomController";
import type { UnifiedLinePlot } from "webgl-plot";
import { ScientificPlotProps, AggregatedResult } from "./types";

const ScientificPlot: React.FC<ScientificPlotProps> = ({
  results,
  initialConfig,
  onExportCSV,
  inputProfile = "mouse",
  isDarkMode = false,
  isBracketOperationPlot = false,
  bracketOperationResults,
}) => {
  // State initialization from config or defaults
  const [numCanvases, setNumCanvases] = useState(initialConfig?.numCanvases ?? 1);
  const [isLogX, setIsLogX] = useState(initialConfig?.isLogX ?? false);
  const [isLogY, setIsLogY] = useState(initialConfig?.isLogY ?? false);
  const [isLogY1, setIsLogY1] = useState(initialConfig?.isLogY1 ?? false);
  const [isLogY2, setIsLogY2] = useState(initialConfig?.isLogY2 ?? false);
  
  // AC detection
  const isACModeActive = results.length > 0 && (results[0] as any).type === "ac";

  // Auto-configure based on results if no config provided
  useEffect(() => {
    if (results.length > 0) {
      if ((results[0] as any).type === "ac") {
        setNumCanvases(2);
        setIsLogX(true);
        setIsLogY1(true);
        setIsLogY2(true);
      }
    }
  }, [results]);

  // Single canvas state
  const [selectedVariables, setSelectedVariables] = useState<string[]>(
    initialConfig?.selectedVariables ?? []
  );
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);

  // Dual canvas state
  const [canvas1SelectedVariables, setCanvas1SelectedVariables] = useState<string[]>([]);
  const [canvas1HoveredVariable, setCanvas1HoveredVariable] = useState<string | null>(null);
  const [canvas2SelectedVariables, setCanvas2SelectedVariables] = useState<string[]>([]);
  const [canvas2HoveredVariable, setCanvas2HoveredVariable] = useState<string | null>(null);

  // Variable initialization logic
  useEffect(() => {
    if (results.length > 0 && results[0]?.variableNames) {
      const allVariables = results[0].variableNames.slice(1);
      
      if (numCanvases === 1) {
        // Default to all variables if none selected
        if (selectedVariables.length === 0) {
          setSelectedVariables(allVariables);
        }
      } else if (numCanvases === 2) {
        if (isACModeActive) {
           const magVars = allVariables.filter(v => v.includes("[mag]"));
           const phaseVars = allVariables.filter(v => v.includes("[phase]"));
           if (canvas1SelectedVariables.length === 0) setCanvas1SelectedVariables(magVars);
           if (canvas2SelectedVariables.length === 0) setCanvas2SelectedVariables(phaseVars);
        } else {
           if (canvas1SelectedVariables.length === 0) setCanvas1SelectedVariables(allVariables);
           if (canvas2SelectedVariables.length === 0) setCanvas2SelectedVariables(allVariables);
        }
      }
    }
  }, [results, numCanvases, isACModeActive]);


  // Shared state
  const [sharedCursorX, setSharedCursorX] = useState<number | null>(null);
  const [sharedCursorVisible, setSharedCursorVisible] = useState(false);
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

  const [isDrawerPinned, setIsDrawerPinned] = useState(false);
  // Using 0 as default emphasized index (optional control could be added)
  const [emphasizedPlotIndex, setEmphasizedPlotIndex] = useState(0);


  // Refs
  const canvas1PlotLineRef = useRef<UnifiedLinePlot | null>(null);
  const canvas2PlotLineRef = useRef<UnifiedLinePlot | null>(null);
  const canvas1ZoomControllerRef = useRef<ZoomController | null>(null);
  const canvas2ZoomControllerRef = useRef<ZoomController | null>(null);
  const canvas1PlotUpdateRef = useRef<(() => void) | null>(null);
  const canvas2PlotUpdateRef = useRef<(() => void) | null>(null);
  const canvas1PlotScalingRef = useRef<(() => void) | null>(null);
  const canvas2PlotScalingRef = useRef<(() => void) | null>(null);


  // Handlers
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
    setIsLogX(newIsLogX);
    
    // Imperative update for immediate feedback in dual mode
    if (numCanvases === 2) {
       canvas1PlotLineRef.current?.setLogAxis(newIsLogX, isLogY1);
       canvas1PlotLineRef.current?.autoScale();
       canvas1PlotLineRef.current?.draw();
       
       canvas2PlotLineRef.current?.setLogAxis(newIsLogX, isLogY2);
       canvas2PlotLineRef.current?.autoScale();
       canvas2PlotLineRef.current?.draw();
    }
  }, [isLogX, isLogY1, isLogY2, numCanvases]);


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
            {!isACModeActive && (
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">Mode:</Text>
                <Button size="sm" variant={numCanvases === 1 ? "solid" : "outline"} onClick={() => setNumCanvases(1)}>Single</Button>
                <Button size="sm" variant={numCanvases === 2 ? "solid" : "outline"} onClick={() => setNumCanvases(2)}>Dual</Button>
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
              <Button size="sm" variant={isLogX ? "solid" : "outline"} onClick={handleLogXToggle}>Log X</Button>
              {numCanvases === 1 ? (
                <Button size="sm" variant={isLogY ? "solid" : "outline"} onClick={() => setIsLogY(!isLogY)}>Log Y</Button>
              ) : (
                <>
                  <Button size="sm" variant={isLogY1 ? "solid" : "outline"} onClick={() => setIsLogY1(!isLogY1)}>Log Y1</Button>
                  <Button size="sm" variant={isLogY2 ? "solid" : "outline"} onClick={() => setIsLogY2(!isLogY2)}>Log Y2</Button>
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
               />
             </Box>
          )}

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
            onSelectedVariablesChange={numCanvases === 1 ? setSelectedVariables : setCanvas1SelectedVariables}
            hoveredVariable={numCanvases === 1 ? hoveredVariable : canvas1HoveredVariable}
            onVariableHover={numCanvases === 1 ? setHoveredVariable : setCanvas1HoveredVariable}
            onPinnedChange={setIsDrawerPinned}
            onExportCSV={handleExportCSV}
            numCanvases={numCanvases}
            isACModeActive={isACModeActive}
            canvas2SelectedVariables={canvas2SelectedVariables}
            onCanvas2SelectedVariablesChange={setCanvas2SelectedVariables}
            canvas2HoveredVariable={canvas2HoveredVariable}
            onCanvas2VariableHover={setCanvas2HoveredVariable}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default ScientificPlot;
