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

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([
    "Schematic",
    "Simulation",
    "Plotting",
  ]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Filter messages based on dev mode AND selected categories
  const filteredMessages = (
    showDevMessages
      ? messages
      : messages.filter((msg) => msg.mLevel === "user" || !msg.mLevel)
  ).filter((msg) => selectedCategories.includes(msg.category));

  const errorCount = filteredMessages.filter((m) => m.type === "error").length;
  const warningCount = filteredMessages.filter(
    (m) => m.type === "warning"
  ).length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  // Determine icon and color
  let icon = <CheckCircle size={16} />;
  let color: string = dialogTheme.status.success.text;
  let tooltipText = "All systems operational";

  if (hasErrors) {
    icon = <AlertCircle size={16} />;
    color = dialogTheme.status.error.text;
    tooltipText = `${errorCount} error${errorCount > 1 ? "s" : ""}`;
  } else if (hasWarnings) {
    icon = <Info size={16} />;
    color = dialogTheme.status.warning.text;
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
                  bg={dialogTheme.status.error.text}
                  color="gray.contrast"
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

                <Flex gap={4} wrap="wrap">
                  {["Schematic", "Simulation", "Plotting"].map((cat) => (
                    <Checkbox.Root
                      key={cat}
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label color={dialogTheme.secondaryText}>{cat}</Checkbox.Label>
                    </Checkbox.Root>
                  ))}
                </Flex>

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
                  {(() => {
                    // Group messages by (Category + Type) to create continuous blocks
                    const groups: {
                      category: string;
                      type: string;
                      messages: typeof filteredMessages;
                    }[] = [];

                    filteredMessages.forEach((msg) => {
                      const lastGroup = groups[groups.length - 1];
                      if (
                        lastGroup &&
                        lastGroup.category === msg.category &&
                        lastGroup.type === msg.type
                      ) {
                        lastGroup.messages.push(msg);
                      } else {
                        groups.push({
                          category: msg.category,
                          type: msg.type,
                          messages: [msg],
                        });
                      }
                    });

                    return groups.map((group, groupIndex) => (
                      <Box key={groupIndex} mb={2}>
                        {/* Category Header */}
                        <Box mb={1}>
                          <Badge
                            size="xs"
                            variant="surface"
                            colorPalette={
                              group.category === "Schematic"
                                ? "blue"
                                : group.category === "Simulation"
                                  ? "purple"
                                  : "cyan"
                            }
                          >
                            {group.category}
                          </Badge>
                        </Box>

                        {/* Continuous Status Bar Block */}
                        <Box
                          borderLeftWidth="4px"
                          borderLeftColor={
                            group.type === "error"
                              ? dialogTheme.status.error.border
                              : group.type === "warning"
                                ? dialogTheme.status.warning.border
                                : dialogTheme.status.success.border
                          }
                          pl={2}
                          py={0} // Tight vertical padding
                          bg={
                            group.type === "error"
                              ? dialogTheme.status.error.bg
                              : group.type === "warning"
                                ? dialogTheme.status.warning.bg
                                : "transparent"
                          }
                          borderRadius="sm"
                        >
                          <VStack align="stretch" gap={0}>
                            {" "}
                            {/* Zero gap for compact text */}
                            {group.messages.map((msg) => (
                              <Flex
                                key={msg.id}
                                justify="space-between"
                                align="flex-start" // Align top for multi-line text
                                gap={3}
                                minH="20px" // Ensure minimum line height consistency
                              >
                                <Text
                                  fontSize="sm"
                                  lineHeight="1.4" // Comfortable but compact reading
                                  color={
                                    msg.type === "error"
                                      ? dialogTheme.status.error.text
                                      : msg.type === "warning"
                                        ? dialogTheme.status.warning.text
                                        : dialogTheme.primaryText
                                  }
                                >
                                  {msg.text}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  whiteSpace="nowrap"
                                  flexShrink={0}
                                  pt="2px"
                                >
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </Text>
                              </Flex>
                            ))}
                          </VStack>
                        </Box>
                      </Box>
                    ));
                  })()}
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
