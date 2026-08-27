
import React from "react";
import { Dialog, Button, Flex, IconButton, Portal } from "@chakra-ui/react";
import { X } from "lucide-react";
import { dialogTheme } from "../styles/uiThemes";

type NewSchematicDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => Promise<void>;
  onLoadDemo: () => Promise<void>;
};

const NewSchematicDialog: React.FC<NewSchematicDialogProps> = ({
  isOpen,
  onClose,
  onClear,
  onLoadDemo,
}) => {
  const handleNewSchematic = React.useCallback(async () => {
    try {
      await onClear();
      onClose();
    } catch (error) {
      console.error("Failed to clear schematic:", error);
    }
  }, [onClear, onClose]);

  const handleLoadDemo = React.useCallback(async () => {
    try {
      await onLoadDemo();
      onClose();
    } catch (error) {
      console.error("Failed to load demo schematic:", error);
    }
  }, [onLoadDemo, onClose]);

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
            maxW={{ base: "95vw", sm: "500px" }}
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
              <Dialog.Title>Create New Schematic</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  position="absolute"
                  top="0"
                  right="0"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  aria-label="Close new schematic dialog"
                >
                  <X />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="6">
              <p>
                Are you sure you want to create a new schematic? This action will
                delete all your current work and cannot be undone.
              </p>
              <p style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
                You can either start fresh or load the demo schematic.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex justify="space-between" width="100%" wrap="wrap" gap={3}>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Flex gap={2} wrap="wrap" justify="flex-end" flex={1}>
                  <Button colorPalette="blue" onClick={handleLoadDemo}>
                    Load Demo
                  </Button>
                  <Button colorPalette="red" onClick={handleNewSchematic}>
                    New Empty Schematic
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

export default NewSchematicDialog;
