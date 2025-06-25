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
import {
  ComponentType,
  getComponentPropertyConfig,
  PropertyField,
  getPropertiesFromSelectedItem,
  applyPropertiesToSelectedItem,
} from "../types/componentTypes";

type PropertiesProps = {
  onCloseButtonClick: () => void;
  selectedItem: SelectedItem;
  canvasHeight: number;
  onApply: (name: string, value: string) => void;
};

const Properties: React.FC<PropertiesProps> = ({
  onCloseButtonClick,
  selectedItem,
  canvasHeight,
  onApply,
}) => {
  // Helper function to get properties from selectedItem
  const getItemProperties = () => {
    return getPropertiesFromSelectedItem(selectedItem);
  };

  const [localValues, setLocalValues] = useState(getItemProperties());

  // Track initial values to detect changes - only set once when component mounts or selectedItem changes
  const [initialValues, setInitialValues] = useState(getItemProperties());

  // Use a ref to track the last selectedItem to detect when it actually changes
  const prevSelectedItemRef = React.useRef(selectedItem);

  // Only update when selectedItem prop actually changes (not on every render)
  React.useEffect(() => {
    const prev = prevSelectedItemRef.current;
    const current = selectedItem;

    // Check if the selectedItem has actually changed
    if (JSON.stringify(current) !== JSON.stringify(prev)) {
      const newProperties = getItemProperties();
      setLocalValues(newProperties);
      setInitialValues(newProperties);
      prevSelectedItemRef.current = selectedItem;
    }
  }, [selectedItem]);

  // Check if values have changed
  const hasChanges =
    JSON.stringify(localValues) !== JSON.stringify(initialValues);

  const handleNameChange = (newName: string) => {
    setLocalValues((prev) => ({ ...prev, name: newName }));
  };

  const handlePropertyChange = (key: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      properties: { ...prev.properties, [key]: value },
    }));
  };

  const handleApply = () => {
    if (selectedItem.type === "wire") {
      onApply?.("name", localValues.name);
    } else {
      const result = applyPropertiesToSelectedItem(
        selectedItem,
        localValues.name,
        localValues.properties
      );
      onApply?.(result.name, result.value);
    }
    setInitialValues(localValues);
    // Don't auto-close when applying via Enter key
  };

  const handleApplyAndClose = () => {
    handleApply();
    onCloseButtonClick();
  };

  const handleCancel = () => {
    setLocalValues(initialValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCloseButtonClick();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;

      const inputs = Array.from(
        form.querySelectorAll("input:not([disabled])")
      ).filter((input) => (input as HTMLInputElement).offsetParent !== null); // Only visible inputs

      const currentIndex = inputs.indexOf(e.currentTarget);
      const nextIndex = currentIndex + 1;

      if (nextIndex < inputs.length) {
        (inputs[nextIndex] as HTMLInputElement).focus();
      } else {
        // If it's the last input, apply and close
        handleApplyAndClose();
      }
    }
  };

  // Render property fields based on component type
  const renderPropertyFields = () => {
    if (selectedItem.type !== "instance") return null;

    const componentType = selectedItem.typeName as ComponentType;
    const propertyConfig = getComponentPropertyConfig(componentType);

    return propertyConfig.map((field: PropertyField) => {
      const currentValue =
        (localValues.properties as Record<string, string>)[field.key] || "";

      return (
        <Field.Root key={field.key}>
          <Field.Label>
            {field.label}
            {field.unit && ` (${field.unit})`}
            {field.required && " *"}
          </Field.Label>
          {field.type === "select" && field.options ? (
            <Input
              placeholder={field.placeholder}
              value={currentValue}
              onChange={(e) => handlePropertyChange(field.key, e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <Input
              placeholder={field.placeholder}
              value={currentValue}
              onChange={(e) => handlePropertyChange(field.key, e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
        </Field.Root>
      );
    });
  };
  return (
    <Float offset="10rem" placement="middle-end">
      <Flex
        direction="column"
        bg="gray.900"
        padding={1.5}
        borderRadius="md"
        width={{ base: "14rem", md: "15rem", lg: "16rem" }}
        maxHeight={
          canvasHeight > 0
            ? `${canvasHeight * 0.9}px`
            : { base: "70vh", md: "80vh" }
        }
        overflowY="hidden"
      >
        <Flex alignItems="end" width={"100%"} justify="flex-end">
          <CloseButton onClick={onCloseButtonClick} />
        </Flex>
        <Flex
          width={"100%"}
          padding={1}
          flex="1"
          overflowY="auto"
          direction="column"
        >
          <Stack
            as="form"
            gap="3"
            maxW="sm"
            onSubmit={(e) => e.preventDefault()}
          >
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
                    value={localValues.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Field.Root>

                {renderPropertyFields()}
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
                    value={localValues.name}
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
