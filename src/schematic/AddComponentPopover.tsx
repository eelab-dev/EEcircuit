import React from "react";
import { Flex, IconButton, Box, Input, Text } from "@chakra-ui/react";
import { createPortal } from "react-dom";
import { Tooltip } from "../components/ui/tooltip";
import { CopyPlus, X } from "lucide-react";
import { AvailableComponent, sendCommand } from "eecircuit-schematic";

// Helper function to group components by category
const groupComponentsByCategory = (components: AvailableComponent[]) => {
  const groups: Record<string, AvailableComponent[]> = {};

  components.forEach((component) => {
    const category = component.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(component);
  });

  // Sort categories for consistent display
  const sortedGroups: Record<string, AvailableComponent[]> = {};
  Object.keys(groups)
    .sort()
    .forEach((category) => {
      sortedGroups[category] = groups[category];
    });

  return sortedGroups;
};

type AddComponentPopoverProps = {
  availableComponents: AvailableComponent[];
};

type ComponentListProps = {
  availableComponents: AvailableComponent[];
  clickCallback: () => void;
  focusedIndex: number;
};

// Component list to render available components grouped by category
const ComponentList = React.forwardRef<HTMLDivElement, ComponentListProps>(
  ({ availableComponents, clickCallback, focusedIndex }, ref) => {
    const groupedComponents = groupComponentsByCategory(availableComponents);

    // Create a flattened list for focus management
    const flattenedComponents: AvailableComponent[] = [];
    Object.values(groupedComponents).forEach((categoryComponents) => {
      flattenedComponents.push(...categoryComponents);
    });

    return (
      <Flex
        ref={ref}
        direction="column"
        width="100%"
        height="100%"
        padding="2"
        overflow="hidden"
        gap="3"
      >
        {Object.entries(groupedComponents).map(
          ([category, categoryComponents], categoryIndex) => {
            const startIndex = flattenedComponents.findIndex((comp) =>
              categoryComponents.includes(comp)
            );

            return (
              <Box key={category}>
                {categoryIndex > 0 && (
                  <Box height="1px" bg="gray.600" width="100%" mb="3" />
                )}
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  color="gray.500"
                  mb="2"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {category}
                </Text>
                <Flex
                  direction="row"
                  justify="flex-start"
                  align="center"
                  width="100%"
                  flexWrap="wrap"
                  gap="2"
                >
                  {categoryComponents.map((component, categoryIndex) => {
                    const globalIndex = startIndex + categoryIndex;
                    return (
                      <Flex
                        key={component.type}
                        direction="column"
                        align="center"
                        width="45%"
                        padding="2"
                        borderWidth="1px"
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: "gray.900" }}
                        bg={
                          focusedIndex === globalIndex
                            ? "gray.700"
                            : "transparent"
                        }
                        tabIndex={-1}
                        onClick={() => {
                          sendCommand({
                            command: "add",
                            instanceType: component.type,
                          });
                          clickCallback();
                        }}
                      >
                        <span
                          style={{ fontSize: "0.8rem", textAlign: "center" }}
                        >
                          {component.type}
                        </span>
                        <Flex
                          justify="center"
                          align="center"
                          height="3rem"
                          overflow="hidden"
                        >
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
                    );
                  })}
                </Flex>
              </Box>
            );
          }
        )}
      </Flex>
    );
  }
);
ComponentList.displayName = "ComponentList";

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
  const listRef = React.useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);

  const closePopover = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  }, []);

  const clickCallBack = React.useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  }, []);

  const openPopover = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const top = "6.25rem";
      const left = rect.right + 8;
      setPopoverPosition({ top: parseFloat(top) * 16, left });
      setIsOpen(true);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredComponents = availableComponents.filter(
    (component) =>
      component.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (document.activeElement === searchInputRef.current) {
        if (filteredComponents.length > 0) {
          setFocusedIndex(0);
        }
      } else {
        setFocusedIndex(-1);
        searchInputRef.current?.focus();
      }
      return;
    }

    if (document.activeElement === searchInputRef.current) {
      if (e.key === "ArrowDown") {
        if (filteredComponents.length > 0) {
          e.preventDefault();
          setFocusedIndex(0);
        }
      }
      return;
    }

    if (focusedIndex >= 0) {
      let newIndex = focusedIndex;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = Math.min(focusedIndex + 2, filteredComponents.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focusedIndex < 2) {
          setFocusedIndex(-1);
          searchInputRef.current?.focus();
          return;
        }
        newIndex = Math.max(focusedIndex - 2, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (focusedIndex % 2 === 0) {
          newIndex = Math.min(focusedIndex + 1, filteredComponents.length - 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (focusedIndex % 2 !== 0) {
          newIndex = Math.max(focusedIndex - 1, 0);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        sendCommand({
          command: "add",
          instanceType: filteredComponents[focusedIndex].type,
        });
        clickCallBack();
        return;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
      }
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closePopover();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, closePopover]);

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
            onKeyDown={handleKeyDown}
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(-1);
                }}
                mb={4}
                bg="gray.700"
                borderColor="gray.600"
              />
              <ComponentList
                ref={listRef}
                availableComponents={filteredComponents}
                clickCallback={clickCallBack}
                focusedIndex={focusedIndex}
              />
            </Box>
          </Box>,
          document.body
        )}
    </>
  );
};

export default AddComponentPopover;
