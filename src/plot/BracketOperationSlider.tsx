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
      p={4}
      pb={2}
      bg={
        colorMode === "dark"
          ? "gray.800"
          : "gray.50"
      }
      borderBottom="1px solid"
      borderColor={
        colorMode === "dark"
          ? "gray.700"
          : "gray.200"
      }
    >
      <Text fontWeight="semibold" mb="2" fontSize="xs">
        Emphasize Parameter Value
      </Text>
      <Slider.Root
        value={[emphasizedPlotIndex]}
        min={0}
        max={parameterValues.length - 1}
        step={1}
        onValueChange={(details: { value: number[] }) => setEmphasizedPlotIndex(details.value[0] ?? 0)}
        mb="2"
        width="100%"
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumbs />
        </Slider.Control>
      </Slider.Root>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Text fontSize="xs" color="fg.muted">
          {formatEngineering(parseFloat(parameterValues[0] || "0"))}{unit}
        </Text>
        <Text fontSize="sm" fontWeight="bold">
          {formatEngineering(parseFloat(currentParameterValue || "0"))}{unit}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {formatEngineering(parseFloat(parameterValues[parameterValues.length - 1] || "0"))}{unit}
        </Text>
      </Box>
    </Box>
  );
};

export default BracketOperationSlider;