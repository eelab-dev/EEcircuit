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
} from "@chakra-ui/react";
import React from "react";
import { Tooltip } from "src/components/ui/tooltip";

type StatusProps = {
  info: string[];
};

const Status: React.FC<StatusProps> = ({ info }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Float>
            <Circle
              size="5"
              bg={info.length === 0 ? "green" : "red"}
              color="white"
            >
              {info.length === 0 ? <span>✓</span> : <span>{info.length}</span>}
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
              <Box p={2} textWrap="nowrap" fontSize="sm" overflowX="auto">
                {info.map((line, index) => (
                  <Tooltip key={index} content={line} openDelay={200}>
                    <Box key={index}>{line}</Box>
                  </Tooltip>
                ))}
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Close</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Flex gap={2} align="center">
                <Clipboard.Root value={info.join("\n")}>
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
