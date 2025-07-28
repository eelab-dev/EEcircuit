import React from "react";
import { ResultType } from "eecircuit-engine";
import { Flex } from "@chakra-ui/react";
import { useColorMode } from "../components/ui/color-mode";
import PlotCanvas from "./plotCanvas";
import PlotSidebar from "./plotSidebar";
import { usePlotState } from "../store/appStore";

interface PlotProps {
  results?: ResultType[]; // Make optional since we can get it from store
}

const Plot: React.FC<PlotProps> = ({ results: propsResults }) => {
  // Use Zustand store for plot state
  const {
    results: storeResults,
    selectedVariables,
    hoveredVariable,
    setSelectedVariables,
    setHoveredVariable,
  } = usePlotState();

  // Use results from props if provided, otherwise from store
  const results = propsResults || storeResults;

  const { colorMode } = useColorMode();

  // Variable selection is now handled in the store's handleNewResults function
  // This ensures persistence across simulation runs while handling removed variables

  return (
    <Flex direction="row" w="100%" h="100%" gap={4} p={4} overflow="hidden">
      <Flex flex="1" minW="0" direction="column" minHeight={0}>
        <PlotCanvas
          results={results}
          selectedVariables={selectedVariables}
          hoveredVariable={hoveredVariable}
          colorMode={colorMode}
        />
      </Flex>
      {results.length > 0 && results[0].variableNames && (
        <PlotSidebar
          variableNames={
            results.length > 0 ? results[0].variableNames || [] : []
          }
          selectedVariables={selectedVariables}
          onSelectedVariablesChange={setSelectedVariables}
          hoveredVariable={hoveredVariable}
          onVariableHover={setHoveredVariable}
        />
      )}
    </Flex>
  );
};

export default Plot;
