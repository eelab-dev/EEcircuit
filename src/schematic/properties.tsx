"use client";

import {
  Button,
  CloseButton,
  Field,
  Flex,
  Float,
  Input,
  Span,
  Stack,
} from "@chakra-ui/react";
import { SelectedItem } from "eecircuit-schematic";
import React, { useState } from "react";

type PropertiesProps = {
  onCloseButtonClick: () => void;
  selectedItem: SelectedItem;
  onApply: (name: string, value: string) => void;
};

const Properties: React.FC<PropertiesProps> = ({
  onCloseButtonClick,
  selectedItem,
  onApply,
}) => {
  // Helper function to get properties from selectedItem
  const getItemProperties = () => {
    if (selectedItem.type === "none") {
      return { name: "", value: "" };
    }

    // Handle instance types (components like resistor, capacitor, etc.)
    if (selectedItem.type === "instance") {
      return {
        name: selectedItem.name || "",
        value: selectedItem.value || "",
      };
    }

    // Handle wire types
    if (selectedItem.type === "wire") {
      return {
        name: selectedItem.netName || "",
        value: "", // Wires typically don't have values
      };
    }

    // Fallback for other item types
    return { name: "", value: "" };
  };

  // Helper function to get appropriate placeholder text for different component types
  const getValuePlaceholder = (typeName: string) => {
    switch (typeName) {
      case "resistor":
        return "Resistance (e.g., 1k, 10ohm)";
      case "capacitor":
        return "Capacitance (e.g., 10uF, 100pF)";
      case "inductor":
        return "Inductance (e.g., 1mH, 10uH)";
      case "vdc":
        return "DC Voltage (e.g., 5V, 1.8V)";
      case "idc":
        return "DC Current (e.g., 1mA, 10uA)";
      case "nFET":
      case "pFET":
        return "W=width L=length (e.g., W=10u L=0.18u)";
      case "VDD":
      case "GND":
        return "Voltage level (e.g., 1.8V, 0V)";
      case "port":
        return "Port specification";
      default:
        return "Component value";
    }
  };

  const [localNameValue, setLocalNameValue] = useState(getItemProperties());

  // Track initial values to detect changes - only set once when component mounts or selectedItem changes
  const [initialNameValue, setInitialNameValue] = useState(getItemProperties());

  // Use a ref to track the last selectedItem to detect when it actually changes
  const prevSelectedItemRef = React.useRef(selectedItem);

  // Only update when selectedItem prop actually changes (not on every render)
  React.useEffect(() => {
    const prev = prevSelectedItemRef.current;
    const current = selectedItem;

    // Check if the selectedItem has actually changed
    if (JSON.stringify(current) !== JSON.stringify(prev)) {
      const newProperties = getItemProperties();
      setLocalNameValue(newProperties);
      setInitialNameValue(newProperties);
      prevSelectedItemRef.current = selectedItem;
    }
  }, [selectedItem]);

  // Check if values have changed
  const hasChanges =
    localNameValue.name !== initialNameValue.name ||
    localNameValue.value !== initialNameValue.value;

  const handleNameChange = (newName: string) => {
    setLocalNameValue((prev) => ({ ...prev, name: newName }));
  };

  const handleValueChange = (newValue: string) => {
    setLocalNameValue((prev) => ({ ...prev, value: newValue }));
  };

  const handleApply = () => {
    // For wire types, apply netName instead of value
    if (selectedItem.type === "wire") {
      onApply?.(localNameValue.name, ""); // Wire name goes to name parameter, no value
    } else {
      onApply?.(localNameValue.name, localNameValue.value);
    }
    setInitialNameValue(localNameValue);
    // Don't auto-close when applying via Enter key
  };

  const handleApplyAndClose = () => {
    // For wire types, apply netName instead of value
    if (selectedItem.type === "wire") {
      onApply?.(localNameValue.name, ""); // Wire name goes to name parameter, no value
    } else {
      onApply?.(localNameValue.name, localNameValue.value);
    }
    setInitialNameValue(localNameValue);
    onCloseButtonClick();
  };

  const handleCancel = () => {
    setLocalNameValue(initialNameValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCloseButtonClick();
    }
  };
  return (
    <Float offset="10rem" placement="middle-end">
      <Flex
        direction="column"
        bg="gray.900"
        padding={1.5}
        borderRadius="md"
        width="15rem"
      >
        <Flex alignItems="end" width={"100%"} justify="flex-end">
          <CloseButton onClick={onCloseButtonClick} />
        </Flex>
        <Flex width={"100%"} padding={1}>
          <Stack gap="3" maxW="sm">
            <Span>Properties</Span>
            {selectedItem.type === "none" && (
              <Span color="gray.500">No item selected</Span>
            )}

            {selectedItem.type === "instance" && (
              <>
                <Field.Root>
                  <Field.Label>Component: {selectedItem.typeName}</Field.Label>
                </Field.Root>

                <Field.Root>
                  <Field.Label>Name</Field.Label>
                  <Input
                    placeholder="Component name (e.g., R1, C1)"
                    value={localNameValue.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Value</Field.Label>
                  <Input
                    placeholder={getValuePlaceholder(selectedItem.typeName)}
                    value={localNameValue.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Field.Root>
              </>
            )}

            {selectedItem.type === "wire" && (
              <>
                <Field.Root>
                  <Field.Label>Wire Properties</Field.Label>
                </Field.Root>

                <Field.Root>
                  <Field.Label>Net Name</Field.Label>
                  <Input
                    placeholder="Network name (e.g., VDD, GND, net1)"
                    value={localNameValue.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Field.Root>
              </>
            )}

            {/* Action buttons */}
            {selectedItem.type !== "none" && (
              <Flex gap="2" mt="4">
                {hasChanges ? (
                  <>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      flex="1"
                      onClick={handleApplyAndClose}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      flex="1"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    width="100%"
                    onClick={onCloseButtonClick}
                  >
                    Close
                  </Button>
                )}
              </Flex>
            )}
          </Stack>
        </Flex>
      </Flex>
    </Float>
  );
};

export default Properties;
