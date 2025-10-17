import React from "react";
import { Dialog, Button, Flex, IconButton, Portal } from "@chakra-ui/react";
import { X } from "lucide-react";
import { sendCommand, loadDemoSchematic } from "eecircuit-schematic";
import { dialogTheme } from "../styles/uiThemes";

type ClearSchematicDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ClearSchematicDialog: React.FC<ClearSchematicDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const handleClearSchematic = React.useCallback(() => {
    sendCommand({ command: "clearSchematic" });
    onClose();
  }, [onClose]);

  const handleLoadDemo = React.useCallback(() => {
    loadDemoSchematic();
    onClose();
  }, [onClose]);

  const handleCancel = React.useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Portal>
      <Dialog.Root
        role="alertdialog"
        open={isOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            onClose();
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="400px"
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex="modal"
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            borderWidth={dialogTheme.borderWidth}
            borderColor={dialogTheme.borderColor}
          >
            <Dialog.Header position="relative" pb="4">
              <Dialog.Title>Clear Schematic</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  position="absolute"
                  top="0"
                  right="0"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  aria-label="Close clear schematic dialog"
                >
                  <X />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="6">
              <p>
                Are you sure you want to clear the schematic? This action will
                delete all your current work and cannot be undone.
              </p>
              <p style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
                You can either clear to start fresh or load the demo schematic.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex justify="space-between" width="100%">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Flex gap={2}>
                  <Button colorPalette="blue" onClick={handleLoadDemo}>
                    Load Demo
                  </Button>
                  <Button colorPalette="red" onClick={handleClearSchematic}>
                    Clear All
                  </Button>
                </Flex>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
};

export default ClearSchematicDialog;
