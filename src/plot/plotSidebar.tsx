import React from "react";
import {
  Checkbox,
  CheckboxGroup,
  Fieldset,
  Flex,
  For,
  Button,
  HStack,
} from "@chakra-ui/react";

interface PlotSidebarProps {
  variableNames: string[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  onSelectedVariablesChange: (variables: string[]) => void;
  onVariableHover: (variable: string | null) => void;
}

const PlotSidebar: React.FC<PlotSidebarProps> = ({
  variableNames,
  selectedVariables,
  hoveredVariable,
  onSelectedVariablesChange,
  onVariableHover,
}) => {
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

  return (
    <Flex flexShrink="0" w="10em" minHeight={0} overflow="hidden">
      <Fieldset.Root w="100%" h="100%">
        <CheckboxGroup
          value={selectedVariables}
          onValueChange={onSelectedVariablesChange}
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
    </Flex>
  );
};

export default PlotSidebar;
