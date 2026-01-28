import React from "react";
import { Box, Text, Slider } from "@chakra-ui/react";
// import { useAppStore } from "../store/appStore"; // Removed
import { formatEngineering, parseSpiceNumber } from "./utils/formatUtils";
import type { AggregatedResult } from "./types"; // Fixed path

interface BracketOperationSliderProps {
  bracketOperationResults: AggregatedResult;
  emphasizedPlotIndex: number;
  onEmphasizedPlotIndexChange: (index: number) => void;
}

const BracketOperationSlider: React.FC<BracketOperationSliderProps> = ({
  bracketOperationResults,
  emphasizedPlotIndex,
  onEmphasizedPlotIndexChange,
}) => {
  // const emphasizedPlotIndex = useAppStore((state) => state.emphasizedPlotIndex);
  // const setEmphasizedPlotIndex = useAppStore((state) => state.setEmphasizedPlotIndex);

  const { parameterValues } = bracketOperationResults;

  if (!parameterValues || parameterValues.length === 0) {
    return null;
  }

  const currentParameterValue = parameterValues[emphasizedPlotIndex];


  return (
    <Box
      w="100%"
      px={4}
      py={2}
      display="flex"
      alignItems="center"
      gap={3}
      fontSize="sm"
      bg="bg.muted"
      borderBottom="1px solid"
      borderColor="border.muted"
    >
      <Text fontWeight="medium" fontSize="xs" minW="fit-content" color="fg.muted">
        Parameter:
      </Text>
      <Box flex="1" px={2}>
        <Slider.Root
          value={[emphasizedPlotIndex]}
          min={0}
          max={parameterValues.length - 1}
          step={1}
          onValueChange={(details: { value: number[] }) => onEmphasizedPlotIndexChange(details.value[0] ?? 0)}
          size="sm"
        >
          <Slider.Control>
            <Slider.Track h="2px" bg="bg.muted">
              <Slider.Range bg="blue.solid" />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </Box>
      <Text fontSize="xs" fontWeight="medium" minW="fit-content">
        {formatEngineering(parseSpiceNumber(currentParameterValue || "0"))}
      </Text>
    </Box>
  );
};

export default BracketOperationSlider;