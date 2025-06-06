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
import React, { useState } from "react";
import { NameValuePair } from "./schematic";

type PropertiesProps = {
  onCloseButtonClick: () => void;
  nameValue: NameValuePair;
  onApply: (name: string, value: string) => void;
};

const Properties: React.FC<PropertiesProps> = ({
  onCloseButtonClick,
  nameValue = { name: "", value: "" },
  onApply,
}) => {
  const [localNameValue, setLocalNameValue] = useState(nameValue);

  // Track initial values to detect changes - only set once when component mounts or nameValue prop changes
  const [initialNameValue, setInitialNameValue] = useState(nameValue);

  // Use a ref to track the last nameValue to detect when it actually changes
  const prevNameValueRef = React.useRef(nameValue);

  // Only update when nameValue prop actually changes (not on every render)
  React.useEffect(() => {
    const prev = prevNameValueRef.current;
    if (nameValue.name !== prev.name || nameValue.value !== prev.value) {
      setLocalNameValue(nameValue);
      setInitialNameValue(nameValue);
      prevNameValueRef.current = nameValue;
    }
  }, [nameValue.name, nameValue.value]);

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
    onApply?.(localNameValue.name, localNameValue.value);
    setInitialNameValue(localNameValue);
    // Don't auto-close when applying via Enter key
  };

  const handleApplyAndClose = () => {
    onApply?.(localNameValue.name, localNameValue.value);
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
            <Field.Root>
              <Field.Label>Name</Field.Label>
              <Input
                placeholder="name"
                value={localNameValue.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Value</Field.Label>
              <Input
                placeholder="value"
                value={localNameValue.value}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </Field.Root>

            {/* Action buttons */}
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
          </Stack>
        </Flex>
      </Flex>
    </Float>
  );
};

export default Properties;
