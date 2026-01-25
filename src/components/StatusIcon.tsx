import React from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  Portal,
  Clipboard,
  Float,
  Circle,
  Checkbox,
  Badge,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertCircle, CheckCircle, Trash2, X, Info } from "lucide-react";
import { Tooltip } from "./ui/tooltip";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/uiThemes";

const StatusIcon: React.FC = () => {
  const messages = useAppStore((state) => state.messages);
  const showDevMessages = useAppStore((state) => state.showDevMessages);
  const setShowDevMessages = useAppStore((state) => state.setShowDevMessages);
  const clearMessages = useAppStore((state) => state.clearMessages);

  // Filter messages based on dev mode
  const filteredMessages = showDevMessages
    ? messages
    : messages.filter((msg) => msg.mLevel === "user" || !msg.mLevel);

  const errorCount = filteredMessages.filter((m) => m.type === "error").length;
  const warningCount = filteredMessages.filter(
    (m) => m.type === "warning"
  ).length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  // Determine icon and color
  let icon = <CheckCircle size={16} />;
  let color = "green.500";
  let tooltipText = "All systems operational";

  if (hasErrors) {
    icon = <AlertCircle size={16} />;
    color = "red.500";
    tooltipText = `${errorCount} error${errorCount > 1 ? "s" : ""}`;
  } else if (hasWarnings) {
    icon = <Info size={16} />;
    color = "orange.500";
    tooltipText = `${warningCount} warning${warningCount > 1 ? "s" : ""}`;
  }

  const handleClear = () => {
    clearMessages();
  };

  return (
    <Dialog.Root>
      <Tooltip content={tooltipText} showArrow openDelay={300}>
        <Dialog.Trigger asChild>
          <IconButton
            size="sm"
            variant="ghost"
            color={color}
            aria-label={tooltipText}
            position="relative"
          >
            {icon}
            {/* Badge for error count */}
            {hasErrors && errorCount > 0 && (
              <Float placement="top-end" offsetX={2} offsetY={2}>
                <Circle
                  size="3.5"
                  bg="red.500"
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  lineHeight="1"
                >
                  {errorCount > 9 ? "9+" : errorCount}
                </Circle>
              </Float>
            )}
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            borderColor={dialogTheme.borderColor}
            position="relative"
            maxW="md"
          >
            <Dialog.Header>
              <Flex align="center" justify="space-between" w="100%">
                <Dialog.Title color={dialogTheme.primaryText}>
                  System Status
                </Dialog.Title>
                <Flex gap={2} align="center">
                  <Clipboard.Root
                    value={filteredMessages
                      .map((m) => `[${m.category}] ${m.type}: ${m.text}`)
                      .join("\n")}
                  >
                    <Clipboard.Trigger asChild>
                      <IconButton
                        variant="ghost"
                        size="xs"
                        color={dialogTheme.primaryText}
                        aria-label="Copy messages"
                      >
                        <Clipboard.Indicator />
                      </IconButton>
                    </Clipboard.Trigger>
                  </Clipboard.Root>
                  <Tooltip content="Clear all messages" openDelay={200}>
                    <IconButton
                      aria-label="Clear messages"
                      size="xs"
                      variant="ghost"
                      color={dialogTheme.primaryText}
                      onClick={handleClear}
                      disabled={filteredMessages.length === 0}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                  <Dialog.CloseTrigger asChild>
                    <IconButton
                      aria-label="Close"
                      size="xs"
                      variant="ghost"
                      color={dialogTheme.primaryText}
                      position="static"
                    >
                      <X size={14} />
                    </IconButton>
                  </Dialog.CloseTrigger>
                </Flex>
              </Flex>
            </Dialog.Header>
            <Dialog.Body>
              <Flex direction="column" gap={3}>
                <Checkbox.Root
                  checked={showDevMessages}
                  onCheckedChange={(e) => setShowDevMessages(!!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label color={dialogTheme.secondaryText}>
                    Show developer messages
                  </Checkbox.Label>
                </Checkbox.Root>

                <VStack
                  align="stretch"
                  gap={2}
                  maxH="300px"
                  overflowY="auto"
                  p={1}
                >
                  {filteredMessages.length === 0 && (
                    <Text
                      color={dialogTheme.secondaryText}
                      fontSize="sm"
                      fontStyle="italic"
                      textAlign="center"
                      py={4}
                    >
                      No status messages.
                    </Text>
                  )}
                  {filteredMessages.map((msg) => (
                    <Box
                      key={msg.id}
                      p={2}
                      borderRadius="md"
                      bg={
                        msg.type === "error"
                          ? "red.500/10"
                          : msg.type === "warning"
                            ? "orange.500/10"
                            : "transparent"
                      }
                      borderLeftWidth="4px"
                      borderLeftColor={
                        msg.type === "error"
                          ? "red.500"
                          : msg.type === "warning"
                            ? "orange.500"
                            : "green.500"
                      }
                    >
                      <Flex justify="space-between" mb={1}>
                        <Badge
                          size="sm"
                          variant="surface"
                          colorPalette={
                            msg.category === "Schematic"
                              ? "blue"
                              : msg.category === "Simulation"
                                ? "purple"
                                : "cyan"
                          }
                        >
                          {msg.category}
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Text>
                      </Flex>
                      <Text
                        fontSize="sm"
                        color={
                          msg.type === "error"
                            ? "red.400"
                            : msg.type === "warning"
                              ? "orange.300"
                              : dialogTheme.primaryText
                        }
                      >
                        {msg.text}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Flex>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  color={dialogTheme.primaryText}
                  borderColor={dialogTheme.borderColor}
                >
                  Close
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default StatusIcon;
