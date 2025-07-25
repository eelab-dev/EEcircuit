import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect, useRef } from "react";
import { SimulationDC } from "../../types/commonTypes";

interface DcConfigProps {
  onConfigChange: (config: string) => void;
  onFullConfigChange?: (config: SimulationDC) => void; // Add callback for full config
  initialData?: SimulationDC;
}

const DcConfig: React.FC<DcConfigProps> = ({
  onConfigChange,
  onFullConfigChange,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    source: initialData?.source || "",
    start: initialData?.start || "",
    stop: initialData?.stop || "",
    step: initialData?.step || "",
  });

  const [dcSimConfig, setDcSimConfig] = useState("");

  // Use a ref to track the name - this prevents re-renders from overwriting user edits
  const nameRef = useRef(initialData?.name);

  // Use a ref to track if we're updating from external data to prevent callback loops
  const isUpdatingFromExternalDataRef = useRef(false);

  // Update form data and name ref when initialData changes (when switching between configs)
  useEffect(() => {
    if (initialData) {
      isUpdatingFromExternalDataRef.current = true; // Set flag before updating
      setFormData({
        source: initialData.source || "",
        start: initialData.start || "",
        stop: initialData.stop || "",
        step: initialData.step || "",
      });
      nameRef.current = initialData.name;
      // Flag will be reset in the next useEffect
    }
  }, [initialData]);

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.dc ${formData.source} ${formData.start} ${formData.stop} ${formData.step}`;
    setDcSimConfig(combined);

    // Skip callbacks if we're updating from external data to prevent infinite loops
    if (isUpdatingFromExternalDataRef.current) {
      isUpdatingFromExternalDataRef.current = false; // Reset the flag
      return;
    }

    // Call the callback with the updated config
    if (onConfigChange) {
      onConfigChange(combined);
    }

    // Call the full config callback with complete DC configuration
    if (
      onFullConfigChange &&
      formData.source &&
      formData.start &&
      formData.stop &&
      formData.step
    ) {
      const fullConfig: SimulationDC = {
        type: "DC",
        name: nameRef.current, // Use the ref to preserve user-edited names
        source: formData.source,
        start: formData.start, // Keep as string to support unit postfixes
        stop: formData.stop, // Keep as string to support unit postfixes
        step: formData.step, // Keep as string to support unit postfixes
      };
      onFullConfigChange(fullConfig);
    }
  }, [formData, onConfigChange]); // Removed onFullConfigChange from dependencies to prevent infinite loops

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <Fieldset.Root size="lg" maxW="md">
        <Stack>
          <Fieldset.Legend>DC Simulation Configuration</Fieldset.Legend>
          <Text
            fontSize="sm"
            color="gray.600"
            p={2}
            bg="gray.50"
            borderRadius="md"
          >
            Combined Config: {dcSimConfig}
          </Text>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>Sweep Source</Field.Label>
            <Input
              name="source"
              value={formData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              placeholder="Source name (e.g., V1, I1)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Start Value (V)</Field.Label>
            <Input
              name="start"
              value={formData.start}
              onChange={(e) => handleInputChange("start", e.target.value)}
              placeholder="e.g., 0, 1m, 5.2"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Stop Value (V)</Field.Label>
            <Input
              name="stop"
              value={formData.stop}
              onChange={(e) => handleInputChange("stop", e.target.value)}
              placeholder="e.g., 10, 1.5k, 2M"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Step size (V)</Field.Label>
            <Input
              name="step"
              value={formData.step}
              onChange={(e) => handleInputChange("step", e.target.value)}
              placeholder="e.g., 0.1, 10m, 1k"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default DcConfig;
