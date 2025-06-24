import React from "react";
import { Flex, IconButton, Popover, Portal } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import { CopyPlus, X } from "lucide-react";
import { AvailableComponent, sendCommand } from "eecircuit-schematic";

type AddComponentPopoverProps = {
  availableComponents: AvailableComponent[];
};

type ComponentListProps = {
  availableComponents: AvailableComponent[];
  clickCallback: () => void;
};

// Component list to render available components
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
              style={{
                width: "100%",
                height: "100%",
                transform: "scaleY(-1)",
              }}
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

const AddComponentPopover: React.FC<AddComponentPopoverProps> = ({
  availableComponents,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const closePopover = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const clickCallBack = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle ESC key press
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closePopover();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closePopover]);

  return (
    <Popover.Root
      positioning={{ placement: "right" }}
      closeOnInteractOutside={false}
      open={isOpen}
      modal={true}
    >
      <Popover.Trigger asChild>
        <Tooltip content="Add Component" showArrow openDelay={300}>
          <IconButton
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            <CopyPlus />
          </IconButton>
        </Tooltip>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="20em" maxWidth="70vw">
            <Popover.Arrow />
            <Popover.Body position="relative">
              <IconButton
                size="xs"
                variant="ghost"
                position="absolute"
                top="1"
                right="1"
                zIndex="1"
                onClick={closePopover}
              >
                <X size={12} />
              </IconButton>
              <ComponentList
                availableComponents={availableComponents}
                clickCallback={clickCallBack}
              />
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default AddComponentPopover;
