import React from "react";
import {
  Button,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Flex,
  Input,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { RotateCcw } from "lucide-react";
import { CustomCheckbox as Checkbox } from "../components/ui/checkbox";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/uiThemes";

interface SimulationConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

const SimulationGlobalConfigDialog: React.FC<SimulationConfigDialogProps> = ({
  open,
  onClose,
}) => {
  const maxWebWorkers = useAppStore((state) => state.maxWebWorkers);
  const setMaxWebWorkers = useAppStore((state) => state.setMaxWebWorkers);
  const resetVariableSelectionsOnNewSim = useAppStore((state) => state.resetVariableSelectionsOnNewSim);
  const setResetVariableSelectionsOnNewSim = useAppStore((state) => state.setResetVariableSelectionsOnNewSim);
  const resetPlotStateOnNewSim = useAppStore((state) => state.resetPlotStateOnNewSim);
  const setResetPlotStateOnNewSim = useAppStore((state) => state.setResetPlotStateOnNewSim);

  const [tempMaxWorkers, setTempMaxWorkers] = React.useState(maxWebWorkers);
  const [tempResetVariableSelections, setTempResetVariableSelections] = React.useState(resetVariableSelectionsOnNewSim);
  const [tempResetPlotState, setTempResetPlotState] = React.useState(resetPlotStateOnNewSim);

  // Reset temp values when dialog opens
  React.useEffect(() => {
    if (open) {
      setTempMaxWorkers(maxWebWorkers);
      setTempResetVariableSelections(resetVariableSelectionsOnNewSim);
      setTempResetPlotState(resetPlotStateOnNewSim);
    }
  }, [open, maxWebWorkers, resetVariableSelectionsOnNewSim, resetPlotStateOnNewSim]);

  const handleSave = () => {
    setMaxWebWorkers(tempMaxWorkers);
    setResetVariableSelectionsOnNewSim(tempResetVariableSelections);
    setResetPlotStateOnNewSim(tempResetPlotState);
    onClose();
  };

  const handleCancel = () => {
    setTempMaxWorkers(maxWebWorkers);
    setTempResetVariableSelections(resetVariableSelectionsOnNewSim);
    setTempResetPlotState(resetPlotStateOnNewSim);
    onClose();
  };

  const handleWorkerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTempMaxWorkers(value);
    }
  };

  const maxPossibleWorkers = navigator.hardwareConcurrency || 8;

  return (
    <DialogRoot open={open} onInteractOutside={handleCancel}>
      <DialogContent
        css={{
          backgroundColor: dialogTheme.bg,
          borderColor: dialogTheme.borderColor,
          backdropFilter: dialogTheme.backdropFilter,
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          maxWidth: "400px",
          width: "90%",
        }}
      >
        <DialogHeader>
          <DialogTitle>Simulation Settings</DialogTitle>
        </DialogHeader>

        <DialogBody pb="6">
          <Flex flexDirection="column" gap="4">
            <Flex flexDirection="column" gap="2">
              <Text fontSize="sm" fontWeight="medium">
                Maximum Parallel Web Workers
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Number of parallel threads for bracket operations. Higher values
                may improve performance but use more system resources.
              </Text>
              <Flex alignItems="center" gap="2">
                <Input
                  type="number"
                  value={tempMaxWorkers}
                  onChange={handleWorkerCountChange}
                  min={1}
                  max={maxPossibleWorkers}
                  width="80px"
                  size="sm"
                />
                <Text fontSize="xs" color="fg.muted">
                  (max: {maxPossibleWorkers} based on your system)
                </Text>
              </Flex>
            </Flex>

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
                  onCheckedChange={(details) => setTempResetVariableSelections(details.checked)}
                  size="sm"
                >
                  <Text fontSize="xs">Clear variable selections on each simulation run</Text>
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
                  onCheckedChange={(details) => setTempResetPlotState(details.checked)}
                  size="sm"
                >
                  <Text fontSize="xs">Clear plot settings on each simulation run</Text>
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
          </Flex>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} colorPalette="blue">
            Save
          </Button>
        </DialogFooter>

        <DialogCloseTrigger onClick={handleCancel} />
      </DialogContent>
    </DialogRoot>
  );
};

export default SimulationGlobalConfigDialog;
