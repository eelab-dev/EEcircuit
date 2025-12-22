import React from "react";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { RotateCcw } from "lucide-react";
import { CustomCheckbox as Checkbox } from "../../ui/checkbox";
import { useAppStore } from "../../../store/appStore";

interface PlotSettingsProps {
  tempResetVariableSelections: boolean;
  setTempResetVariableSelections: (value: boolean) => void;
  tempResetPlotState: boolean;
  setTempResetPlotState: (value: boolean) => void;
}

const PlotSettings: React.FC<PlotSettingsProps> = ({
  tempResetVariableSelections,
  setTempResetVariableSelections,
  tempResetPlotState,
  setTempResetPlotState,
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
    </Flex>
  );
};

export default PlotSettings;
