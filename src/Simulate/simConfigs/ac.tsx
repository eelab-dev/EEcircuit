import {
  Field,
  Fieldset,
  Input,
  Stack,
  Text,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";
import React, { useState, useEffect, useRef } from "react";
import { SimulationAC } from "../../types/commonTypes";

interface AcConfigProps {
  onConfigChange: (config: string) => void;
  onFullConfigChange?: (config: SimulationAC) => void; // Add callback for full config
  initialData?: SimulationAC;
}

const AcConfig: React.FC<AcConfigProps> = ({
  onConfigChange,
  onFullConfigChange,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    source: initialData?.source || "",
    frequencyStart: initialData?.frequencyStart || "",
    frequencyStop: initialData?.frequencyStop || "",
    stepNumber: initialData?.stepNumber || "", // Updated to match SimulationAC type
    sweepType: initialData?.sweepType || ("lin" as "lin" | "log" | "dec"),
  });

  const [acSimConfig, setAcSimConfig] = useState("");

  // Use a ref to track the name - this prevents re-renders from overwriting user edits
  const nameRef = useRef(initialData?.name);

  // Use a ref to track if we're updating from external data to prevent callback loops
  const isUpdatingFromExternalDataRef = useRef(false);

  // Use refs to store the latest callback functions to prevent focus loss issues
  const onConfigChangeRef = useRef(onConfigChange);
  const onFullConfigChangeRef = useRef(onFullConfigChange);

  // Update callback refs when they change
  useEffect(() => {
    onConfigChangeRef.current = onConfigChange;
    onFullConfigChangeRef.current = onFullConfigChange;
  }, [onConfigChange, onFullConfigChange]);

  // Update form data and name ref when initialData changes (when switching between configs)
  useEffect(() => {
    console.log("AC Config: initialData changed:", initialData); // Debug logging

    isUpdatingFromExternalDataRef.current = true; // Set flag before updating

    if (initialData) {
      setFormData({
        source: initialData.source || "",
        frequencyStart: initialData.frequencyStart || "",
        frequencyStop: initialData.frequencyStop || "",
        stepNumber: initialData.stepNumber || "",
        sweepType: initialData.sweepType || "lin",
      });
      nameRef.current = initialData.name;
    } else {
      // Clear form when no initial data (e.g., when switching from another config type)
      setFormData({
        source: "",
        frequencyStart: "",
        frequencyStop: "",
        stepNumber: "",
        sweepType: "lin",
      });
      nameRef.current = undefined;
    }
    // Flag will be reset in the next useEffect
  }, [initialData]);

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.ac ${formData.sweepType} ${formData.stepNumber} ${formData.frequencyStart} ${formData.frequencyStop}`;
    setAcSimConfig(combined);

    // Skip callbacks if we're updating from external data to prevent infinite loops
    if (isUpdatingFromExternalDataRef.current) {
      isUpdatingFromExternalDataRef.current = false; // Reset the flag
      return;
    }

    // Use setTimeout to debounce callback execution and prevent focus loss during rapid typing
    const timeoutId = setTimeout(() => {
      // Call the callback with the updated config string using ref to prevent focus loss
      if (onConfigChangeRef.current) {
        onConfigChangeRef.current(combined);
      }

      // Call the full config callback with complete AC configuration using ref to prevent focus loss
      if (
        onFullConfigChangeRef.current &&
        formData.source &&
        formData.sweepType &&
        formData.frequencyStart &&
        formData.frequencyStop &&
        formData.stepNumber // Updated to match property name
      ) {
        const fullConfig: SimulationAC = {
          type: "AC",
          name: nameRef.current, // Use the ref to preserve user-edited names
          source: formData.source,
          sweepType: formData.sweepType as SimulationAC["sweepType"],
          frequencyStart: formData.frequencyStart, // Keep as string to support unit postfixes
          frequencyStop: formData.frequencyStop, // Keep as string to support unit postfixes
          stepNumber: formData.stepNumber, // Updated to match SimulationAC type
        };
        onFullConfigChangeRef.current(fullConfig);
      }
    }, 100); // 100ms debounce to prevent focus loss during typing

    // Cleanup timeout on dependency change to prevent stale callbacks
    return () => clearTimeout(timeoutId);
  }, [formData]); // Removed onConfigChange from dependencies to prevent focus loss issues

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <Fieldset.Root size="sm" maxW="md">
        <Stack gap={2}>
          <Fieldset.Legend fontSize="sm">AC Simulation</Fieldset.Legend>
          <Text
            fontSize="xs"
            color="gray.600"
            p={1}
            bg="gray.50"
            borderRadius="md"
          >
            {acSimConfig}
          </Text>
        </Stack>

        <Fieldset.Content gap={2}>
          <Field.Root>
            <Field.Label fontSize="sm">Source</Field.Label>
            <Input
              size="sm"
              name="source"
              value={formData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              placeholder="e.g., V1, I1"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Sweep Type</Field.Label>
            <NativeSelectRoot size="sm">
              <NativeSelectField
                value={formData.sweepType}
                onChange={(e) => {
                  handleInputChange(
                    "sweepType",
                    e.target.value as SimulationAC["sweepType"]
                  );
                }}
              >
                <option value="dec">Decade</option>
                <option value="oct">Octave</option>
                <option value="lin">Linear</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Start Frequency</Field.Label>
            <Input
              size="sm"
              name="frequencyStart"
              value={formData.frequencyStart}
              onChange={(e) =>
                handleInputChange("frequencyStart", e.target.value)
              }
              placeholder="e.g., 1, 10k"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Stop Frequency</Field.Label>
            <Input
              size="sm"
              name="frequencyStop"
              value={formData.frequencyStop}
              onChange={(e) =>
                handleInputChange("frequencyStop", e.target.value)
              }
              placeholder="e.g., 1M, 2G"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Steps Number</Field.Label>
            <Input
              size="sm"
              name="stepNumber"
              value={formData.stepNumber}
              onChange={(e) => handleInputChange("stepNumber", e.target.value)}
              placeholder="e.g., 10, 100, 1k"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default AcConfig;
