import React, { useState, useEffect } from "react";
import {
  Checkbox,
  CheckboxGroup,
  For,
  Button,
  HStack,
  IconButton,
  Box,
  Text,
} from "@chakra-ui/react";
import { ChevronRight, Settings, Pin, PinOff, Download } from "lucide-react";
import { dialogTheme } from "../styles/dialogTheme";

interface PlotSidebarProps {
  variableNames: string[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  onSelectedVariablesChange: (variables: string[]) => void;
  onVariableHover: (variable: string | null) => void;
  onPinnedChange?: (isPinned: boolean) => void;
  onExportCSV?: () => void;
}

// PlotSidebar implements a responsive drawer system for plot variable selection.
// On desktop: drawer is pinned by default and affects canvas layout when pinned.
// On mobile: drawer is closed by default and operates as an overlay.
// The drawer uses local state management passed via props rather than Zustand store
// to avoid checkbox state synchronization issues with Chakra UI's CheckboxGroup.
const PlotSidebar: React.FC<PlotSidebarProps> = ({
  variableNames,
  selectedVariables,
  hoveredVariable,
  onSelectedVariablesChange,
  onVariableHover,
  onPinnedChange,
  onExportCSV,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile and set default states
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);

      // Set defaults based on screen size
      if (mobile) {
        // Mobile: closed and unpinned by default
        setIsDrawerOpen(false);
        setIsPinned(false);
        onPinnedChange?.(false);
      } else {
        // Desktop: open and pinned by default
        setIsDrawerOpen(true);
        setIsPinned(true);
        onPinnedChange?.(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [onPinnedChange]);

  if (variableNames.length === 0) {
    return null;
  }

  const handleSelectAll = () => {
    // Select all variables except the first one (x-axis)
    onSelectedVariablesChange(variableNames.slice(1));
  };

  const handleDeselectAll = () => {
    onSelectedVariablesChange([]);
  };

  const handleToggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleTogglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);

    // Notify parent of pin state change
    onPinnedChange?.(newPinned);

    // If unpinning and on desktop, close the drawer
    if (!newPinned && !isMobile) {
      setIsDrawerOpen(false);
    }
  };

  // SidebarContent component - linear layout since scrolling is handled by parent
  const SidebarContent = () => (
    <CheckboxGroup
      value={selectedVariables}
      onValueChange={(newValues) => {
        onSelectedVariablesChange(newValues);
      }}
      name="variables"
    >
      {/* Top section with legend and action buttons */}
      <Text
        fontSize="sm"
        mb="2"
        fontWeight="medium"
        color={dialogTheme.secondaryText}
      >
        X-axis: {variableNames[0]}
      </Text>

      <HStack gap="1" w="100%" mb="3">
        <Button
          size="xs"
          variant="outline"
          onClick={handleSelectAll}
          fontSize="xs"
          flex="1"
          minW="0"
        >
          All
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={handleDeselectAll}
          fontSize="xs"
          flex="1"
          minW="0"
        >
          None
        </Button>
      </HStack>

      {/* Checkbox list */}
      <For each={variableNames.slice(1)}>
        {(value) => (
          <Checkbox.Root
            key={value}
            value={value}
            onMouseEnter={() => onVariableHover(value)}
            onMouseLeave={() => onVariableHover(null)}
            mb="2"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label
              fontWeight={hoveredVariable === value ? "semibold" : "normal"}
              transition="font-weight 0.1s ease"
            >
              {value}
            </Checkbox.Label>
          </Checkbox.Root>
        )}
      </For>
    </CheckboxGroup>
  );

  return (
    <>
      {/* Toggle button - always visible */}
      <IconButton
        position="absolute"
        top="50%"
        right={isDrawerOpen && !isMobile ? "13rem" : "1rem"}
        transform="translateY(-50%)"
        zIndex={1001}
        size="sm"
        aria-label={
          isDrawerOpen ? "Close plot variables" : "Open plot variables"
        }
        onClick={handleToggleDrawer}
        bg={dialogTheme.buttonIconBg}
        backdropFilter={dialogTheme.toggleButtonBackdropFilter}
        transition="right 0.3s ease"
      >
        {isDrawerOpen ? <ChevronRight size={16} /> : <Settings size={16} />}
      </IconButton>

      {/* Desktop custom sidebar - constrained to tab height */}
      {!isMobile && isDrawerOpen && (
        <Box
          position="absolute"
          top={0}
          right={0}
          width="12rem"
          height="100%"
          bg={dialogTheme.bg}
          backdropFilter={dialogTheme.backdropFilter}
          borderLeft="1px solid"
          borderColor={dialogTheme.borderColor}
          borderRadius="md"
          shadow="sm"
          zIndex={1000}
        >
          {/* Header */}
          <Box
            p={4}
            borderBottom="1px solid"
            borderColor={dialogTheme.borderColor}
          >
            <HStack justify="space-between" align="center">
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={dialogTheme.secondaryText}
              >
                Plot Variables
              </Text>
              <HStack gap={1}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePin}
                  aria-label={isPinned ? "Unpin drawer" : "Pin drawer"}
                >
                  {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
                </IconButton>
                {!isPinned && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Close sidebar"
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                )}
              </HStack>
            </HStack>
          </Box>

          {/* Body with fixed bottom button */}
          <Box position="relative" height="calc(100% - 64px)" overflow="hidden">
            {/* Scrollable content area */}
            <Box
              p={4}
              height={onExportCSV ? "calc(100% - 60px)" : "100%"}
              overflowY="auto"
              overflowX="hidden"
            >
              <SidebarContent />
            </Box>

            {/* Fixed bottom button */}
            {onExportCSV && (
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                p={4}
                pt={2}
                bg={dialogTheme.bg}
                backdropFilter={dialogTheme.backdropFilter}
                borderTop="1px solid"
                borderColor={dialogTheme.borderColor}
              >
                <Button
                  size="xs"
                  variant="solid"
                  onClick={onExportCSV}
                  fontSize="xs"
                  w="100%"
                >
                  <Download size={14} />
                  Download CSV
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Mobile overlay - still use modal style for mobile */}
      {isMobile && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1500}
          display={isDrawerOpen ? "block" : "none"}
        >
          {/* Backdrop */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.600"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Mobile drawer content */}
          <Box
            position="absolute"
            top={0}
            right={0}
            width="20rem"
            maxWidth="80vw"
            height="100vh"
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            shadow="2xl"
          >
            {/* Header */}
            <Box
              p={4}
              borderBottom="1px solid"
              borderColor={dialogTheme.borderColor}
            >
              <HStack justify="space-between" align="center">
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={dialogTheme.secondaryText}
                >
                  Plot Variables
                </Text>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close sidebar"
                >
                  <ChevronRight size={16} />
                </IconButton>
              </HStack>
            </Box>

            {/* Body with fixed bottom button */}
            <Box
              position="relative"
              height="calc(100% - 64px)"
              overflow="hidden"
            >
              {/* Scrollable content area */}
              <Box
                p={4}
                height={onExportCSV ? "calc(100% - 60px)" : "100%"}
                overflowY="auto"
                overflowX="hidden"
              >
                <SidebarContent />
              </Box>

              {/* Fixed bottom button */}
              {onExportCSV && (
                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  p={4}
                  pt={2}
                  bg={dialogTheme.bg}
                  backdropFilter={dialogTheme.backdropFilter}
                  borderTop="1px solid"
                  borderColor={dialogTheme.borderColor}
                >
                  <Button
                    size="xs"
                    variant="solid"
                    onClick={onExportCSV}
                    fontSize="xs"
                    w="100%"
                  >
                    <Download size={14} />
                    Download CSV
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default PlotSidebar;
