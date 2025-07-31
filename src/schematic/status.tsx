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
import React from "react";
import { Tooltip } from "src/components/ui/tooltip";
import { useAppStore } from "../store/appStore";

type StatusProps = {
  info: {message: string, mLevel: "user" | "dev"}[];
};

const Status: React.FC<StatusProps> = ({ info }) => {
  const showDevMessages = useAppStore((state) => state.showDevMessages);
  const setShowDevMessages = useAppStore((state) => state.setShowDevMessages);
  
  const filteredInfo = showDevMessages ? info : info.filter((item) => item.mLevel === "user");
  const errors = filteredInfo.filter((item) => item.message.startsWith("error:"));
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Float>
            <Circle
              size="5"
              bg={errors.length === 0 ? "green" : "red"}
              color="white"
            >
              {errors.length === 0 ? <span>✓</span> : <span>{errors.length}</span>}
            </Circle>
          </Float>
          Status
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Status Messages</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Flex direction="column" gap={3}>
                <Checkbox.Root
                  checked={showDevMessages}
                  onCheckedChange={(e) => setShowDevMessages(e.checked === true)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Show dev messages</Checkbox.Label>
                </Checkbox.Root>
                <Box p={2} textWrap="nowrap" fontSize="sm" overflowX="auto">
                  {filteredInfo.map((item, index) => (
                    <Tooltip key={index} content={item.message} openDelay={200}>
                      <Box key={index}>{item.message}</Box>
                    </Tooltip>
                  ))}
                </Box>
              </Flex>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Close</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Flex gap={2} align="center">
                <Clipboard.Root value={filteredInfo.map(item => item.message).join("\n")}>
                  <Clipboard.Trigger asChild>
                    <IconButton variant="surface" size="xs">
                      <Clipboard.Indicator />
                    </IconButton>
                  </Clipboard.Trigger>
                </Clipboard.Root>
                <CloseButton size="sm" />
              </Flex>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
export default Status;
