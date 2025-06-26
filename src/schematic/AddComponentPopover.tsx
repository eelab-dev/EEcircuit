import React from "react";
import { Flex, IconButton, Box, Input } from "@chakra-ui/react";
import { createPortal } from "react-dom";
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
          <Flex justify="center" align="center" height="3rem" overflow="hidden">
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [popoverPosition, setPopoverPosition] = React.useState({
    top: 0,
    left: 0,
  });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const closePopover = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  const clickCallBack = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  const openPopover = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      // Force it to appear at a very specific position - top-left area
      const top = "6.25rem"; // Fixed 6.25rem from top (100px equivalent)
      const left = rect.right + 8;

      console.log("Forcing position to:", { top, left });

      setPopoverPosition({ top: parseFloat(top) * 16, left }); // Convert rem to px for positioning
      setIsOpen(true);
    }
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

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        const popoverElement = document.getElementById("component-popover");
        if (popoverElement && !popoverElement.contains(event.target as Node)) {
          closePopover();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closePopover]);

  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredComponents = availableComponents.filter((component) =>
    component.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Tooltip content="Add Component" showArrow openDelay={300}>
        <IconButton ref={buttonRef} onClick={openPopover}>
          <CopyPlus />
        </IconButton>
      </Tooltip>

      {isOpen &&
        createPortal(
          <Box
            id="component-popover"
            position="fixed"
            top={`${popoverPosition.top}px`}
            left={`${popoverPosition.left}px`}
            width="16rem"
            maxWidth="60vw"
            height="31.25rem"
            maxHeight="80vh"
            bg="gray.800"
            borderRadius="md"
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.600"
            zIndex={1500}
            overflowY="auto"
          >
            <Box position="relative" p={4}>
              <IconButton
                size="xs"
                variant="ghost"
                position="absolute"
                top="0.25rem"
                right="0.25rem"
                zIndex="1"
                onClick={closePopover}
              >
                <X size={12} />
              </IconButton>
              <Input
                ref={searchInputRef}
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                mb={4}
                bg="gray.700"
                borderColor="gray.600"
              />
              <ComponentList
                availableComponents={filteredComponents}
                clickCallback={clickCallBack}
              />
            </Box>
          </Box>,
          document.body
        )}
    </>
  );
};

export default AddComponentPopover;