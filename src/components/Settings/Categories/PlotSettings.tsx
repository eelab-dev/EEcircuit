import React from "react";
import { Flex, IconButton, Text, Box, Slider } from "@chakra-ui/react";
import { RotateCcw } from "lucide-react";
import { CustomCheckbox as Checkbox } from "../../ui/checkbox";
import { useAppStore } from "../../../store/appStore";

interface PlotSettingsProps {
  tempResetVariableSelections: boolean;
  setTempResetVariableSelections: (value: boolean) => void;
  tempResetPlotState: boolean;
  setTempResetPlotState: (value: boolean) => void;
  lineThickness: number;
  setLineThickness: (value: number) => void;
}

const PlotSettings: React.FC<PlotSettingsProps> = ({
  tempResetVariableSelections,
  setTempResetVariableSelections,
  tempResetPlotState,
  setTempResetPlotState,
  lineThickness,
  setLineThickness,
}) => {
  return (
    <Flex flexDirection="column" gap="3">
      <Text fontSize="sm" fontWeight="medium">
        Plot Reset Options
      </Text>
      <Text fontSize="xs" color="fg.muted">
        Configure what happens when starting new simulations:
      </Text>

      <Flex alignItems="center" justifyContent="space-between">
        <Checkbox
          checked={tempResetVariableSelections}
          onCheckedChange={(details) =>
            setTempResetVariableSelections(!!details.checked)
          }
          size="sm"
        >
          <Text fontSize="xs">
            Clear variable selections on each simulation run
          </Text>
        </Checkbox>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={() => {
            const { resetVariableSelections } = useAppStore.getState();
            resetVariableSelections();
          }}
          title="Reset variable selections to default (select all)"
          aria-label="Reset variable selections to default"
        >
          <RotateCcw size={12} />
        </IconButton>
      </Flex>

      <Flex alignItems="center" justifyContent="space-between">
        <Checkbox
          checked={tempResetPlotState}
          onCheckedChange={(details) =>
            setTempResetPlotState(!!details.checked)
          }
          size="sm"
        >
          <Text fontSize="xs">
            Clear plot settings on each simulation run
          </Text>
        </Checkbox>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={() => {
            const { resetPlotState } = useAppStore.getState();
            resetPlotState();
          }}
          title="Reset plot settings to default (single canvas, linear scales)"
          aria-label="Reset plot settings to default"
        >
          <RotateCcw size={12} />
        </IconButton>
      </Flex>

      <Box pt={2}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Line Thickness
        </Text>
        <Flex alignItems="center" gap={3}>
          <Box flex="1">
            <Slider.Root
              min={1}
              max={10}
              step={0.5}
              value={[lineThickness]}
              onValueChange={(details) => setLineThickness(details.value[0] ?? 1)}
              size="sm"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>
          <Text fontSize="xs" minW="3ch">
            {lineThickness}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
};

export default PlotSettings;
