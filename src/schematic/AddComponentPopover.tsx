import React from "react";
import { Flex, IconButton, Box, Input, Text } from "@chakra-ui/react";
import { createPortal } from "react-dom";
import { Tooltip } from "../components/ui/tooltip";
import { CopyPlus, X } from "lucide-react";
import { AvailableComponent, sendCommand } from "eecircuit-schematic";
import { dialogTheme } from "../styles/uiThemes";
import { useAppStore } from "../store/appStore";

type ComponentCategory = AvailableComponent["category"];

const createCategoryPriority = (): Record<ComponentCategory, number> => {
  const priorities: Record<ComponentCategory, number> = {
    passive: 1, // resistors, capacitors, inductors
    transistor: 2, // nFET, pFET
    source: 3, // voltage and current sources
    power: 4, // VDD, GND
    "dependent-source": 5, // dependent sources (VCVS, CCCS, etc.)
    connection: 6, // ports, connections
  };

  return priorities;
};

// Helper function to apply theme-aware styling to SVG content using string replacement
const applySvgTheming = (svgContent: string, isDark: boolean): string => {
  const targetColor = isDark ? "#ffffff" : "#000000";

  // Replace common color attributes with theme-appropriate colors
  let themedSvg = svgContent
    // Replace stroke colors (but preserve 'none')
    .replace(/stroke=["'](?!none)[^"']*["']/gi, `stroke="${targetColor}"`)
    // Replace fill colors (but preserve 'none')
    .replace(/fill=["'](?!none)[^"']*["']/gi, `fill="${targetColor}"`)
    // Handle style attributes with stroke
    .replace(/stroke:\s*(?!none)[^;"'}]*/gi, `stroke: ${targetColor}`)
    // Handle style attributes with fill
    .replace(/fill:\s*(?!none)[^;"'}]*/gi, `fill: ${targetColor}`);

  // If no stroke or fill attributes found, add default stroke
  if (
    !themedSvg.includes("stroke=") &&
    !themedSvg.includes("fill=") &&
    !themedSvg.includes("stroke:") &&
    !themedSvg.includes("fill:")
  ) {
    themedSvg = themedSvg.replace(
      /<svg([^>]*)>/,
      `<svg$1 stroke="${targetColor}" fill="none">`
    );
  }

  return themedSvg;
};

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

  // Get type-safe category priority mapping
  const categoryPriority = createCategoryPriority();

  // Sort categories by priority, then alphabetically for same priority
  const sortedGroups: Record<string, AvailableComponent[]> = {};
  Object.keys(groups)
    .sort((a, b) => {
      const priorityA = categoryPriority[a as ComponentCategory] ?? 999;
      const priorityB = categoryPriority[b as ComponentCategory] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort alphabetically
      return a.localeCompare(b);
    })
    .forEach((category) => {
      sortedGroups[category] = groups[category]!;
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
  isDarkMode: boolean;
  styles: {
    categoryText: { color: string };
    categoryDivider: { bg: string };
    componentItem: { borderColor: string; hoverBg: string; focusBg: string };
    componentText: { color: string };
  };
};

// Component list to render available components grouped by category
const ComponentList = React.forwardRef<HTMLDivElement, ComponentListProps>(
  (
    { availableComponents, clickCallback, focusedIndex, isDarkMode, styles },
    ref
  ) => {
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
                  <Box
                    height="1px"
                    bg={styles.categoryDivider.bg}
                    width="100%"
                    mb="3"
                  />
                )}
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  color={styles.categoryText.color}
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
                        borderColor={styles.componentItem.borderColor}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: styles.componentItem.hoverBg }}
                        bg={
                          focusedIndex === globalIndex
                            ? styles.componentItem.focusBg
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
                          style={{
                            fontSize: "0.8rem",
                            textAlign: "center",
                            color: styles.componentText.color,
                          }}
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
                              __html: applySvgTheming(
                                component.svg,
                                isDarkMode
                              ),
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

  // Theme-aware icon coloring using Chakra UI's color mode
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  const styles = {
    popover: {
      bg: dialogTheme.bg,
      borderColor: dialogTheme.borderColor,
    },
    input: {
      bg: dialogTheme.inputBg,
      borderColor: dialogTheme.inputBorderColor,
    },
    categoryText: {
      color: dialogTheme.categoryText,
    },
    categoryDivider: {
      bg: dialogTheme.dividerBg,
    },
    componentItem: {
      borderColor: dialogTheme.itemBorderColor,
      hoverBg: dialogTheme.hoverBg,
      focusBg: dialogTheme.focusBg,
    },
    componentText: {
      color: dialogTheme.primaryText,
    },
  };

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

  const filteredComponents = availableComponents.filter((component) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const componentType = component.type.toLowerCase();

    // Filter any component that includes the search term in the component name/type only
    return componentType.includes(query);
  });

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
          instanceType: filteredComponents[focusedIndex]!.type,
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
      // Close on Escape or § when open
      if ((event.key === "Escape" || event.key === "§") && isOpen) {
        closePopover();
        return;
      }

      // Open on "A" (no modifiers) when not focused in inputs
      if (!isOpen) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key;
        if (key === "a" || key === "A") {
          const target = event.target as HTMLElement | null;
          const tag = (target?.tagName || "").toLowerCase();
          const isEditable = !!target?.isContentEditable;
          if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            isEditable
          ) {
            return;
          }
          event.preventDefault();
          openPopover();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, closePopover, openPopover]);

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
      <Tooltip content="Add Component (A)" showArrow openDelay={300}>
        <IconButton
          ref={buttonRef}
          onClick={openPopover}
          bg={dialogTheme.buttonIconBg}
        >
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
            bg={styles.popover.bg}
            backdropFilter="blur(12px)"
            borderRadius="md"
            boxShadow="lg"
            border="1px solid"
            borderColor={styles.popover.borderColor}
            zIndex={1500}
            overflowY="auto"
            onKeyDown={handleKeyDown}
          >
            <Box p={4}>
              <Flex align="center" gap={2} mb={4}>
                <Input
                  ref={searchInputRef}
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  bg={styles.input.bg}
                  borderColor={styles.input.borderColor}
                  flex={1}
                />
                <IconButton
                  aria-label="Close add component"
                  size="sm"
                  variant="ghost"
                  onClick={closePopover}
                >
                  <X size={14} />
                </IconButton>
              </Flex>
              <ComponentList
                ref={listRef}
                availableComponents={filteredComponents}
                clickCallback={clickCallBack}
                focusedIndex={focusedIndex}
                isDarkMode={isDarkMode}
                styles={{
                  categoryText: styles.categoryText,
                  categoryDivider: styles.categoryDivider,
                  componentItem: styles.componentItem,
                  componentText: styles.componentText,
                }}
              />
            </Box>
          </Box>,
          document.body
        )}
    </>
  );
};

export default AddComponentPopover;
