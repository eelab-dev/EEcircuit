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
} from "@chakra-ui/react";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/dialogTheme";

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

  const [tempMaxWorkers, setTempMaxWorkers] = React.useState(maxWebWorkers);

  // Reset temp value when dialog opens
  React.useEffect(() => {
    if (open) {
      setTempMaxWorkers(maxWebWorkers);
    }
  }, [open, maxWebWorkers]);

  const handleSave = () => {
    setMaxWebWorkers(tempMaxWorkers);
    onClose();
  };

  const handleCancel = () => {
    setTempMaxWorkers(maxWebWorkers);
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
