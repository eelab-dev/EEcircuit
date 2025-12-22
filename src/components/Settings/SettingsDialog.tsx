import React, { useState } from "react";
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
  Box,
} from "@chakra-ui/react";
import { useAppStore } from "../../store/appStore";
import { dialogTheme } from "../../styles/uiThemes";
import SettingsSidebar, { SettingsCategory } from "./SettingsSidebar";
import SimulationSettings from "./Categories/SimulationSettings";
import PlotSettings from "./Categories/PlotSettings";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const maxWebWorkers = useAppStore((state) => state.maxWebWorkers);
  const setMaxWebWorkers = useAppStore((state) => state.setMaxWebWorkers);
  const resetVariableSelectionsOnNewSim = useAppStore(
    (state) => state.resetVariableSelectionsOnNewSim
  );
  const setResetVariableSelectionsOnNewSim = useAppStore(
    (state) => state.setResetVariableSelectionsOnNewSim
  );
  const resetPlotStateOnNewSim = useAppStore(
    (state) => state.resetPlotStateOnNewSim
  );
  const setResetPlotStateOnNewSim = useAppStore(
    (state) => state.setResetPlotStateOnNewSim
  );

  // Local state for temp values
  const [tempMaxWorkers, setTempMaxWorkers] = useState(maxWebWorkers);
  const [tempResetVariableSelections, setTempResetVariableSelections] =
    useState(resetVariableSelectionsOnNewSim);
  const [tempResetPlotState, setTempResetPlotState] = useState(
    resetPlotStateOnNewSim
  );

  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("simulation");



  const handleSave = () => {
    setMaxWebWorkers(tempMaxWorkers);
    setResetVariableSelectionsOnNewSim(tempResetVariableSelections);
    setResetPlotStateOnNewSim(tempResetPlotState);
    onClose();
  };

  const handleCancel = () => {
    // Revert temp values to store values
    setTempMaxWorkers(maxWebWorkers);
    setTempResetVariableSelections(resetVariableSelectionsOnNewSim);
    setTempResetPlotState(resetPlotStateOnNewSim);
    onClose();
  };

  return (
    <DialogRoot open={open} onInteractOutside={handleCancel} size="lg">
      <DialogContent
        css={{
          backgroundColor: dialogTheme.bg,
          borderColor: dialogTheme.borderColor,
          backdropFilter: dialogTheme.backdropFilter,
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          width: "90%",
          maxWidth: "700px",
          height: "500px", // Fixed height for two-column layout
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader borderBottomWidth="1px" borderColor="border.muted" pb={4}>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <DialogBody p={0} display="flex" flex={1} overflow="hidden">
          <Flex width="100%" height="100%">
            {/* Sidebar - Left Column */}
            <Box width="250px" height="100%">
              <SettingsSidebar
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
              />
            </Box>

            {/* Content - Right Column */}
            <Box flex={1} p={6} overflowY="auto">
              {activeCategory === "simulation" && (
                <SimulationSettings
                  tempMaxWorkers={tempMaxWorkers}
                  setTempMaxWorkers={setTempMaxWorkers}
                />
              )}
              {activeCategory === "plotting" && (
                <PlotSettings
                  tempResetVariableSelections={tempResetVariableSelections}
                  setTempResetVariableSelections={
                    setTempResetVariableSelections
                  }
                  tempResetPlotState={tempResetPlotState}
                  setTempResetPlotState={setTempResetPlotState}
                />
              )}
            </Box>
          </Flex>
        </DialogBody>

        <DialogFooter borderTopWidth="1px" borderColor="border.muted" pt={4}>
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

export default SettingsDialog;
