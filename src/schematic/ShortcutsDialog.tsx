import React from "react";
import {
  Dialog,
  Button,
  IconButton,
  Portal,
  Box,
  Text,
  VStack,
  Heading,
} from "@chakra-ui/react";
import { X, Keyboard } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/uiThemes";

type ShortcutsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const inputProfile = useAppStore((state) => state.inputProfile);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const styles = {
    heading: {
      color: dialogTheme.categoryText,
    },
    text: {
      color: dialogTheme.secondaryText,
    },
    keyBox: {
      bg: dialogTheme.keyBoxBg,
      borderColor: dialogTheme.keyBoxBorderColor,
      color: dialogTheme.keyBoxText,
    },
  };

  const getProfileNavigationInstructions = () => {
    if (inputProfile === "mouse") {
      return [
        { keys: "Right Down + Drag", description: "Pan the canvas" },
        { keys: "Scroll Wheel", description: "Zoom in and out" },
        { keys: "Shift + Scroll", description: "Pan horizontally" },
        { keys: "Ctrl + Scroll", description: "Pan vertically" },
      ];
    } else if (inputProfile === "trackpad") {
      return [
        { keys: "Two Finger Pinch", description: "Pinch and zoom" },
        { keys: "Two Finger Drag", description: "Pan the canvas" },
      ];
    } else if (inputProfile === "touchscreen") {
      return [
        { keys: "Two Finger Pinch", description: "Pinch and zoom" },
        { keys: "Two Finger Drag", description: "Pan the canvas" },
      ];
    }
    return [];
  };

  const shortcutSections = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: "F", description: "Fit and center the canvas" },
        { keys: "O", description: "Return to the origin" },
      ],
    },
    {
      title: "Mode Controls",
      shortcuts: [
        { keys: "M", description: "Move component" },
        { keys: "W", description: "Enter wire mode" },
        { keys: "T", description: "Enter text mode" },
        { keys: "Shift + D", description: "Activate delete mode" },
        { keys: "Esc or §", description: "Cancel any mode (iPad keyboards use §)" },
      ],
    },
    {
      title: "While Moving",
      shortcuts: [
        { keys: "R", description: "Rotate component" },
        { keys: "H", description: "Horizontal flip" },
        { keys: "V", description: "Vertical flip" },
      ],
    },
    {
      title: "Actions",
      shortcuts: [
        { keys: "Shift + Z", description: "Undo" },
        { keys: "Shift + R", description: "Redo" },
        { keys: "Shift + H", description: "This shortcuts dialog" },
        { keys: "Ctrl + H", description: "This shortcuts dialog" },
      ],
    },
  ];

  return (
    <Portal>
      <Dialog.Root
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
            maxW={{ base: "90vw", sm: "35rem", md: "40rem", lg: "42rem" }}
            maxH="85vh"
            minW={{ base: "20rem", sm: "30rem" }}
            w="fit-content"
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex="modal"
            overflowY="auto"
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            borderWidth={dialogTheme.borderWidth}
            borderColor={dialogTheme.borderColor}
          >
            <Dialog.Header position="relative" pb="4">
              <Dialog.Title>
                <Box display="flex" alignItems="center" gap={2}>
                  <Keyboard size={20} />
                  Keyboard Shortcuts
                </Box>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  position="absolute"
                  top="0"
                  right="0"
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                >
                  <X />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="4">
              {/* Navigation Section - Full Width */}
              <Box mb="4">
                <Heading size="sm" mb="2" color={styles.heading.color}>
                  Navigation ({inputProfile})
                </Heading>
                <VStack gap={1.5} align="stretch">
                  {getProfileNavigationInstructions().map(
                    (instruction, index) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="flex-start"
                        gap={2}
                      >
                        <Box
                          bg={styles.keyBox.bg}
                          color={styles.keyBox.color}
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          fontFamily="mono"
                          fontSize="xs"
                          textAlign="center"
                          border="1px solid"
                          borderColor={styles.keyBox.borderColor}
                          minW="fit-content"
                          whiteSpace="nowrap"
                          fontWeight="medium"
                          flexShrink={0}
                        >
                          {instruction.keys}
                        </Box>
                        <Text
                          fontSize="sm"
                          color={styles.text.color}
                          flex={1}
                          lineHeight="1.3"
                          wordBreak="break-word"
                        >
                          {instruction.description}
                        </Text>
                      </Box>
                    )
                  )}
                </VStack>
              </Box>

              {/* Keyboard Shortcuts Section - Two Columns */}
              <Box
                display="flex"
                flexDirection={{ base: "column", md: "row" }}
                gap="0rem"
              >
                <Box
                  flex={{ base: "1", md: "0 0 48%" }}
                  pr={{ base: "0", md: "1rem" }}
                  mb={{ base: "1rem", md: "0" }}
                >
                  {shortcutSections.slice(0, 2).map((section, sectionIndex) => (
                    <Box key={sectionIndex} mb={{ base: "3", md: "4" }}>
                      <Heading
                        size="sm"
                        mb={{ base: "1.5", md: "2" }}
                        color={styles.heading.color}
                      >
                        {section.title}
                      </Heading>
                      <VStack gap={1.5} align="stretch">
                        {section.shortcuts.map((shortcut, index) => (
                          <Box
                            key={index}
                            display="flex"
                            alignItems="flex-start"
                            gap={2}
                          >
                            <Box
                              bg={styles.keyBox.bg}
                              color={styles.keyBox.color}
                              px={1.5}
                              py={0.5}
                              borderRadius="sm"
                              fontFamily="mono"
                              fontSize="xs"
                              textAlign="center"
                              border="1px solid"
                              borderColor={styles.keyBox.borderColor}
                              minW="fit-content"
                              whiteSpace="nowrap"
                              fontWeight="medium"
                              flexShrink={0}
                            >
                              {shortcut.keys}
                            </Box>
                            <Text
                              fontSize="sm"
                              color={styles.text.color}
                              flex={1}
                              lineHeight="1.3"
                              wordBreak="break-word"
                            >
                              {shortcut.description}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  ))}
                </Box>
                <Box
                  flex={{ base: "1", md: "0 0 48%" }}
                  pl={{ base: "0", md: "1rem" }}
                >
                  {shortcutSections.slice(2).map((section, sectionIndex) => (
                    <Box key={sectionIndex + 2} mb={{ base: "3", md: "4" }}>
                      <Heading
                        size="sm"
                        mb={{ base: "1.5", md: "2" }}
                        color={styles.heading.color}
                      >
                        {section.title}
                      </Heading>
                      <VStack gap={1.5} align="stretch">
                        {section.shortcuts.map((shortcut, index) => (
                          <Box
                            key={index}
                            display="flex"
                            alignItems="flex-start"
                            gap={2}
                          >
                            <Box
                              bg={styles.keyBox.bg}
                              color={styles.keyBox.color}
                              px={1.5}
                              py={0.5}
                              borderRadius="sm"
                              fontFamily="mono"
                              fontSize="xs"
                              textAlign="center"
                              border="1px solid"
                              borderColor={styles.keyBox.borderColor}
                              minW="fit-content"
                              whiteSpace="nowrap"
                              fontWeight="medium"
                              flexShrink={0}
                            >
                              {shortcut.keys}
                            </Box>
                            <Text
                              fontSize="sm"
                              color={styles.text.color}
                              flex={1}
                              lineHeight="1.3"
                              wordBreak="break-word"
                            >
                              {shortcut.description}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={handleClose} width="100%" variant="outline">
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
};

export default ShortcutsDialog;
