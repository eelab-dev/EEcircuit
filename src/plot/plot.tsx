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
  
  // Use local state for plot variable selection instead of Zustand store
  // This approach is necessary because CheckboxGroup's controlled behavior
  // works better with local React state. Previous attempts to use Zustand
  // store for selectedVariables caused checkbox state update issues.
  // For future refactoring: if moving back to store state, ensure proper
  // state synchronization between CheckboxGroup and store updates.
  const [selectedVariables, setSelectedVariables] = React.useState<string[]>([]);
  const [hoveredVariable, setHoveredVariable] = React.useState<string | null>(null);

  // Use results from props if provided, otherwise from store
  const results = propsResults || storeResults;

  const { colorMode } = useColorMode();
  
  // State for drawer pinning
  const [isDrawerPinned, setIsDrawerPinned] = React.useState(false);

  // Initialize with all variables selected by default (like original)
  React.useEffect(() => {
    if (results.length > 0 && results[0].variableNames) {
      // Skip the first variable (usually time) and select all others by default
      setSelectedVariables(results[0].variableNames.slice(1));
    }
  }, [results]);

  // Variable selection initialization: select all variables except first (time/frequency)
  // by default when new results arrive. This matches the original behavior.

  const handleExportCSV = () => {
    exportResultsToCSV(results);
  };

  return (
    <Flex direction="row" w="100%" h="100%" gap={4} p={4} overflow="hidden" position="relative">
      <Flex 
        flex="1" 
        minW="0" 
        direction="column" 
        minHeight={0}
        marginRight={{ base: 0, md: isDrawerPinned ? "12rem" : 0 }}
        transition="margin-right 0.3s ease"
      >
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
          onPinnedChange={setIsDrawerPinned}
        />
      )}
      {results.length > 0 && (
        <Button
          position="absolute"
          bottom={4}
          right={isDrawerPinned ? "13rem" : "1rem"}
          onClick={handleExportCSV}
          size="sm"
          variant="outline"
          zIndex={1000}
          transition="right 0.3s ease"
        >
          <Download size={16} />
          Download CSV
        </Button>
      )}
    </Flex>
  );
};

export default Plot;
