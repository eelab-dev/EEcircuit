import React from "react";
import { Flex, IconButton, Popover, Portal, Separator } from "@chakra-ui/react";

import {
  Cable,
  CircleDot,
  CopyPlus,
  FileDown,
  Fullscreen,
  Hand,
  ImageDown,
  MousePointer,
  Move,
  Trash2,
} from "lucide-react";

const Actions: React.FC = () => {
  return (
    <Flex direction="column" spaceY={2}>
      <IconButton>
        <MousePointer />
      </IconButton>
      <IconButton>
        <Move />
      </IconButton>
      <Separator />
      <IconButton>
        <Cable />
      </IconButton>
      <Popover.Root
        positioning={{ placement: "right" }}
        closeOnInteractOutside={false}
      >
        <Popover.Trigger asChild>
          <IconButton>
            <CopyPlus />
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content>
              <Popover.Arrow />
              <Popover.Body>Some content</Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <Separator />
      <IconButton>
        <Trash2 />
      </IconButton>
      <Separator />
      <IconButton>
        <Hand />
      </IconButton>
      <IconButton>
        <Fullscreen />
      </IconButton>
      <IconButton>
        <CircleDot />
      </IconButton>
      <IconButton>
        <ImageDown />
      </IconButton>
      <IconButton>
        <FileDown />
      </IconButton>
    </Flex>
  );
};

export default Actions;
