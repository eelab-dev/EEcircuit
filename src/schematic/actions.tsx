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
import { AvailableComponent, sendCommand } from "eecircuit-schematic";

type ActionsProps = {
  availableComponents: AvailableComponent[];
};

type ComponentListProps = {
  availableComponents: AvailableComponent[];
  clickCallback: () => void;
};

// Create an internal component to render the list and handle closing
const ComponentList: React.FC<ComponentListProps> = ({
  availableComponents,
  clickCallback,
}) => {
  return (
    <Flex
      direction="row"
      justify="space-between"
      align="center"
      width="100%"
      height="100%"
      padding="2"
      overflow="hidden"
      flexWrap="wrap"
    >
      {availableComponents.map((component) => (
        <Flex
          key={component.type}
          direction="column"
          align="center"
          width="45%"
          padding="2"
          margin="1"
          borderWidth="1px"
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: "gray.900" }}
          onClick={() => {
            sendCommand({
              command: "add",
              instanceType: component.type,
            });
            clickCallback();
          }}
        >
          <span style={{ fontSize: "0.8rem", textAlign: "center" }}>
            {component.type}
          </span>
          <Flex justify="center" align="center" height="3em" overflow="hidden">
            <div
              style={{ width: "100%", height: "100%" }}
              dangerouslySetInnerHTML={{
                __html: component.svg,
              }}
            />
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};

const Actions: React.FC<ActionsProps> = ({ availableComponents }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const clickCallBack = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Flex direction="column" spaceY={2} flexWrap={"wrap"}>
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
        open={isOpen}
        modal={true}
      >
        <Popover.Trigger asChild>
          <IconButton
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            <CopyPlus />
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width="20em" maxWidth="70vw">
              <Popover.Arrow />
              <Popover.Body>
                <ComponentList
                  availableComponents={availableComponents}
                  clickCallback={clickCallBack}
                />
              </Popover.Body>
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
      <IconButton
        onClick={() => {
          sendCommand({ command: "view", viewType: "fit" });
        }}
      >
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
