"use client";

import React from "react";
import { Checkbox } from "@chakra-ui/react";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (details: { checked: boolean }) => void;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export const CustomCheckbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  size = "md",
  children,
}) => {
  const handleChange = (details: { checked: string | boolean }) => {
    onCheckedChange({ checked: Boolean(details.checked) });
  };

  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={handleChange}
      size={size}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label>
        {children}
      </Checkbox.Label>
    </Checkbox.Root>
  );
};