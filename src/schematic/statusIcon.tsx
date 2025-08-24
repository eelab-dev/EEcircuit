import React from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  IconButton,
  Portal,
  Clipboard,
  Float,
  Circle,
  Checkbox,
} from "@chakra-ui/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Tooltip } from "src/components/ui/tooltip";
import { useAppStore } from "../store/appStore";
import { dialogTheme } from "../styles/uiThemes";

type StatusIconProps = {
  info: { message: string; mLevel: "user" | "dev" }[];
};

const StatusIcon: React.FC<StatusIconProps> = ({ info }) => {
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
            >
              <Dialog.Header>
                <Dialog.Title color={dialogTheme.primaryText}>
                  Status Messages
                </Dialog.Title>
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
              <Dialog.CloseTrigger asChild>
                <Flex gap={2} align="center">
                  <Clipboard.Root
                    value={filteredInfo.map((item) => item.message).join("\n")}
                  >
                    <Clipboard.Trigger asChild>
                      <IconButton
                        variant="surface"
                        size="xs"
                        color={dialogTheme.primaryText}
                      >
                        <Clipboard.Indicator />
                      </IconButton>
                    </Clipboard.Trigger>
                  </Clipboard.Root>
                  <CloseButton size="sm" color={dialogTheme.primaryText} />
                </Flex>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};

export default StatusIcon;
