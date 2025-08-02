import React, { useState, useEffect } from "react";
import {
  Checkbox,
  CheckboxGroup,
  Fieldset,
  For,
  Button,
  HStack,
  IconButton,
  Drawer,
} from "@chakra-ui/react";
import { ChevronRight, Settings, Pin, PinOff } from "lucide-react";

interface PlotSidebarProps {
  variableNames: string[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  onSelectedVariablesChange: (variables: string[]) => void;
  onVariableHover: (variable: string | null) => void;
  onPinnedChange?: (isPinned: boolean) => void;
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // SidebarContent component encapsulates the variable selection form.
  // Uses Chakra UI's CheckboxGroup in controlled mode with local state.
  // This approach ensures reliable checkbox state updates.
  const SidebarContent = () => (
    <Fieldset.Root w="100%" h="100%">
      <CheckboxGroup
        value={selectedVariables}
        onValueChange={(newValues) => {
          onSelectedVariablesChange(newValues);
        }}
        name="variables"
      >
        <Fieldset.Legend fontSize="sm" mb="2">
          X-axis: {variableNames[0]}
        </Fieldset.Legend>

        <HStack mb="3" gap="1" w="100%">
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

        <Fieldset.Content overflowY="auto" maxHeight="100%">
          <For each={variableNames.slice(1)}>
            {(value) => (
              <Checkbox.Root
                key={value}
                value={value}
                onMouseEnter={() => onVariableHover(value)}
                onMouseLeave={() => onVariableHover(null)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label
                  fontWeight={
                    hoveredVariable === value ? "semibold" : "normal"
                  }
                  transition="font-weight 0.1s ease"
                >
                  {value}
                </Checkbox.Label>
              </Checkbox.Root>
            )}
          </For>
        </Fieldset.Content>
      </CheckboxGroup>
    </Fieldset.Root>
  );

  return (
    <>
      {/* Toggle button - always visible */}
      <IconButton
        position="fixed"
        top="50%"
        right={isDrawerOpen && !isMobile ? "13rem" : "1rem"}
        transform="translateY(-50%)"
        zIndex={1001}
        size="sm"
        aria-label={isDrawerOpen ? "Close plot variables" : "Open plot variables"}
        onClick={handleToggleDrawer}
        bg="gray.100/90"
        backdropFilter="blur(8px)"
        transition="right 0.3s ease"
      >
        {isDrawerOpen ? <ChevronRight size={16} /> : <Settings size={16} />}
      </IconButton>

      {/* Desktop drawer - positioned sidebar */}
      {!isMobile && (
        <Drawer.Root 
          open={isDrawerOpen} 
          onOpenChange={(e) => {
            // Only allow closing if not pinned
            if (!isPinned || !e.open) {
              setIsDrawerOpen(e.open);
            }
          }}
          placement="end"
          size="xs"
          modal={false}
        >
          <Drawer.Positioner>
            <Drawer.Content 
              position="fixed"
              top="0"
              right="0"
              height="100vh"
              width="12rem"
              zIndex={1000}
            >
              <Drawer.Header>
                <Drawer.Title>Plot Variables</Drawer.Title>
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
                    <Drawer.CloseTrigger asChild>
                      <IconButton variant="ghost" size="sm">
                        <ChevronRight size={16} />
                      </IconButton>
                    </Drawer.CloseTrigger>
                  )}
                </HStack>
              </Drawer.Header>
              <Drawer.Body p={4}>
                <SidebarContent />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      )}

      {/* Mobile drawer - modal style */}
      {isMobile && (
        <Drawer.Root 
          open={isDrawerOpen} 
          onOpenChange={(e) => setIsDrawerOpen(e.open)}
          placement="end"
          size="xs"
        >
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Plot Variables</Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <IconButton variant="ghost" size="sm">
                    <ChevronRight size={16} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body p={4}>
                <SidebarContent />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      )}
    </>
  );
};

export default PlotSidebar;
