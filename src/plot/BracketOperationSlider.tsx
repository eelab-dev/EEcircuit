import React from "react";
import { Box, Text, Slider } from "@chakra-ui/react";
import { useAppStore } from "../store/appStore";
import { formatEngineering } from "./formatUtils";
import type { AggregatedResult } from "../simulation/resultAggregator";

interface BracketOperationSliderProps {
  bracketOperationResults: AggregatedResult;
  colorMode: "light" | "dark";
}

const BracketOperationSlider: React.FC<BracketOperationSliderProps> = ({
  bracketOperationResults,
  colorMode,
}) => {
  const emphasizedPlotIndex = useAppStore((state) => state.emphasizedPlotIndex);
  const setEmphasizedPlotIndex = useAppStore((state) => state.setEmphasizedPlotIndex);

  const { parameterValues, bracketOperation } = bracketOperationResults;

  if (!parameterValues || parameterValues.length === 0) {
    return null;
  }

  const currentParameterValue = parameterValues[emphasizedPlotIndex];
  const unit = bracketOperation?.unit || "";

  return (
    <Box
      w="100%"
      px={4}
      py={2}
      display="flex"
      alignItems="center"
      gap={3}
      fontSize="sm"
      bg={
        colorMode === "dark"
          ? "gray.900"
          : "gray.100"
      }
      borderBottom="1px solid"
      borderColor={
        colorMode === "dark"
          ? "gray.700"
          : "gray.300"
      }
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
          onValueChange={(details: { value: number[] }) => setEmphasizedPlotIndex(details.value[0] ?? 0)}
          size="sm"
        >
          <Slider.Control>
            <Slider.Track h="2px" bg={colorMode === "dark" ? "gray.700" : "gray.300"}>
              <Slider.Range bg={colorMode === "dark" ? "blue.400" : "blue.500"} />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </Box>
      <Text fontSize="xs" fontWeight="medium" minW="fit-content">
        {formatEngineering(parseFloat(currentParameterValue || "0"))}{unit}
      </Text>
    </Box>
  );
};

export default BracketOperationSlider;