import React from "react";
import { ResultType } from "eecircuit-engine";
import { Flex, Button } from "@chakra-ui/react";
import { useColorMode } from "../components/ui/color-mode";
import PlotCanvas from "./plotCanvas";
import PlotSidebar from "./plotSidebar";
import { useAppStore } from "../store/appStore";
import { Download } from "lucide-react";
import { exportResultsToCSV } from "../utils/csvExport";

interface PlotProps {
  results?: ResultType[]; // Make optional since we can get it from store
}

const Plot: React.FC<PlotProps> = ({ results: propsResults }) => {
  // Use Zustand store for plot state
  const storeResults = useAppStore((state) => state.results);
  const selectedVariables = useAppStore((state) => state.selectedVariables);
  const hoveredVariable = useAppStore((state) => state.hoveredVariable);
  const setSelectedVariables = useAppStore(
    (state) => state.setSelectedVariables
  );
  const setHoveredVariable = useAppStore((state) => state.setHoveredVariable);

  // Use results from props if provided, otherwise from store
  const results = propsResults || storeResults;

  const { colorMode } = useColorMode();

  // Variable selection is now handled in the store's handleNewResults function
  // This ensures persistence across simulation runs while handling removed variables

  const handleExportCSV = () => {
    exportResultsToCSV(results);
  };

  return (
    <Flex direction="row" w="100%" h="100%" gap={4} p={4} overflow="hidden" position="relative">
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
      {results.length > 0 && (
        <Button
          position="absolute"
          bottom={4}
          right={4}
          onClick={handleExportCSV}
          size="sm"
          variant="outline"
          zIndex={1000}
        >
          <Download size={16} />
          Download CSV
        </Button>
      )}
    </Flex>
  );
};

export default Plot;
