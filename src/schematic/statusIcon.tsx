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
} from "@chakra-ui/react";
import { AlertCircle, CheckCircle, Trash2, X } from "lucide-react";
import { Tooltip } from "src/components/ui/tooltip";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/uiThemes";

type StatusIconProps = {
  info: { message: string; mLevel: "user" | "dev" }[];
  onClear?: () => void;
};

const StatusIcon: React.FC<StatusIconProps> = ({ info, onClear }) => {
  const showDevMessages = useAppStore((state) => state.showDevMessages);
  const setShowDevMessages = useAppStore((state) => state.setShowDevMessages);

  const filteredInfo = showDevMessages
    ? info
    : info.filter((item) => item.mLevel === "user");
  const errors = filteredInfo.filter((item) =>
    item.message.startsWith("error:")
  );
  const hasErrors = errors.length > 0;

  return (
    <Box position="absolute" top="1rem" right="1rem" zIndex={100}>
      <Dialog.Root>
        <Tooltip
          content={hasErrors ? `${errors.length} errors` : "All good"}
          showArrow
          openDelay={300}
        >
          <Dialog.Trigger asChild>
            <IconButton
              size="sm"
              bg={dialogTheme.bg}
              backdropFilter={dialogTheme.backdropFilter}
              borderRadius="md"
              border={dialogTheme.borderWidth}
              borderColor={dialogTheme.borderColor}
              color={hasErrors ? "red.500" : "green.500"}
              _hover={{ bg: dialogTheme.hoverBg }}
              boxShadow="lg"
              position="relative"
              aria-label={
                hasErrors
                  ? "Open status messages, errors present"
                  : "Open status messages"
              }
            >
              {hasErrors ? (
                <AlertCircle size={16} />
              ) : (
                <CheckCircle size={16} />
              )}

              {/* Badge for error count */}
              {hasErrors && errors.length > 1 && (
                <Float placement="top-end" offsetX={-2} offsetY={2}>
                  <Circle
                    size="4"
                    bg="red.500"
                    color="white"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {errors.length}
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
            >
              <Dialog.Header>
                <Flex align="center" justify="space-between" w="100%">
                  <Dialog.Title color={dialogTheme.primaryText}>
                    Status Messages
                  </Dialog.Title>
                  <Flex gap={2} align="center">
                    <Clipboard.Root
                      value={filteredInfo.map((item) => item.message).join("\n")}
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
                    <Tooltip content="Clear messages" openDelay={200}>
                      <IconButton
                        aria-label="Clear messages"
                        size="xs"
                        variant="ghost"
                        color={dialogTheme.primaryText}
                        onClick={() => onClear?.()}
                        disabled={!onClear || filteredInfo.length === 0}
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
                    onCheckedChange={(e) =>
                      setShowDevMessages(e.checked === true)
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label color={dialogTheme.secondaryText}>
                      Show dev messages
                    </Checkbox.Label>
                  </Checkbox.Root>
                  <Box
                    p={2}
                    textWrap="nowrap"
                    fontSize="sm"
                    overflowX="auto"
                    maxH="200px"
                    overflowY="auto"
                  >
                    {filteredInfo.map((item, index) => (
                      <Tooltip
                        key={index}
                        content={item.message}
                        openDelay={200}
                      >
                        <Box
                          key={index}
                          color={
                            item.message.startsWith("error:")
                              ? "red.400"
                              : dialogTheme.primaryText
                          }
                          mb={1}
                        >
                          {item.message}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
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
    </Box>
  );
};

export default StatusIcon;
