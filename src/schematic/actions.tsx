import React from "react";
import {
  Flex,
  IconButton,
  Popover,
  Portal,
  Separator,
  Dialog,
  Button,
} from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";

import {
  Cable,
  CircleDot,
  CopyPlus,
  Eraser,
  FileDown,
  Fullscreen,
  Hand,
  ImageDown,
  MousePointer,
  Move,
  Trash2,
  X,
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

const Actions: React.FC<ActionsProps> = ({ availableComponents }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCompact, setIsCompact] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const clickCallBack = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClearSchematic = React.useCallback(() => {
    sendCommand({ command: "clearSchematic" });
    setShowClearDialog(false);
  }, []);

  const handleCancelClear = React.useCallback(() => {
    setShowClearDialog(false);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      // Use viewport height units - 45rem is approximately 720px
      const viewportHeight = window.innerHeight;
      const shouldBeCompact = viewportHeight < 40 * 16; // 40rem in pixels (640px)

      console.log(
        "Viewport height:",
        viewportHeight,
        "Should be compact:",
        shouldBeCompact
      );
      setIsCompact(shouldBeCompact);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr 1fr" : "1fr",
        gap: isCompact ? "0.25rem" : "0.5rem",
        backgroundColor: "var(--chakra-colors-gray-800)",
        padding: "0.375rem",
        borderRadius: "0.375rem",
        width: "fit-content",
        maxWidth: isCompact ? "7rem" : "auto",
      }}
    >
      <Tooltip content="Select/Move" showArrow openDelay={300}>
        <IconButton>
          <MousePointer />
        </IconButton>
      </Tooltip>
      <Tooltip content="Pan View" showArrow openDelay={300}>
        <IconButton>
          <Move />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Add Wire" showArrow openDelay={300}>
        <IconButton>
          <Cable />
        </IconButton>
      </Tooltip>
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
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Remove Selected" showArrow openDelay={300}>
        <IconButton>
          <Eraser />
        </IconButton>
      </Tooltip>
      <Tooltip content="Clear Schematic" showArrow openDelay={300}>
        <IconButton onClick={() => setShowClearDialog(true)}>
          <Trash2 />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Hand Tool" showArrow openDelay={300}>
        <IconButton>
          <Hand />
        </IconButton>
      </Tooltip>
      <Tooltip content="Fit to Screen" showArrow openDelay={300}>
        <IconButton
          onClick={() => {
            sendCommand({ command: "view", viewType: "fit" });
          }}
        >
          <Fullscreen />
        </IconButton>
      </Tooltip>
      <Tooltip content="Return to Origin" showArrow openDelay={300}>
        <IconButton>
          <CircleDot />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export Image" showArrow openDelay={300}>
        <IconButton>
          <ImageDown />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export File" showArrow openDelay={300}>
        <IconButton>
          <FileDown />
        </IconButton>
      </Tooltip>

      {/* Clear Schematic Confirmation Dialog - Rendered outside of component container */}
      <Portal>
        <Dialog.Root
          open={showClearDialog}
          onOpenChange={(details) => setShowClearDialog(details.open)}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              maxW="400px"
              position="fixed"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              zIndex="modal"
            >
              <Dialog.Header position="relative" pb="4">
                <Dialog.Title>Clear Schematic</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <IconButton
                    position="absolute"
                    top="0"
                    right="0"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelClear}
                  >
                    <X />
                  </IconButton>
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body pb="6">
                <p>
                  Are you sure you want to clear the schematic? This action will
                  delete all your current work and cannot be undone.
                </p>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex justify="space-between" width="100%">
                  <Button variant="outline" onClick={handleCancelClear}>
                    No, Cancel
                  </Button>
                  <Button colorScheme="red" onClick={handleClearSchematic}>
                    Yes, Clear All
                  </Button>
                </Flex>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </Portal>
    </div>
  );
};

export default Actions;
