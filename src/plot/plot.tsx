import React, { useEffect, useState } from "react";
import { ResultType } from "eecircuit-engine";
import { Flex } from "@chakra-ui/react";
import { useColorMode } from "../components/ui/color-mode";
import PlotCanvas from "./plotCanvas";
import PlotSidebar from "./plotSidebar";

interface PlotProps {
  results: ResultType[];
}

const Plot: React.FC<PlotProps> = ({ results }) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);
  const { colorMode } = useColorMode();

  // Initialize with all variables selected by default
  useEffect(() => {
    if (results.length > 0 && results[0].variableNames) {
      // Skip the first variable (usually time) and select all others by default
      setSelectedVariables(results[0].variableNames.slice(1));
    }
  }, [results]);

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
          variableNames={results[0].variableNames}
          selectedVariables={selectedVariables}
          hoveredVariable={hoveredVariable}
          onSelectedVariablesChange={setSelectedVariables}
          onVariableHover={setHoveredVariable}
        />
      )}
    </Flex>
  );
};

export default Plot;
