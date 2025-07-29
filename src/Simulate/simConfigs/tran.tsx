import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect, useRef } from "react";
import { SimulationTransient } from "../../types/commonTypes";

interface TransConfigProps {
  onConfigChange: (config: string) => void;
  onFullConfigChange?: (config: SimulationTransient) => void; // Add callback for full config
  initialData?: SimulationTransient;
}

const TransConfig: React.FC<TransConfigProps> = ({
  onConfigChange,
  onFullConfigChange,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    stopTime: initialData?.stopTime || "",
    timeStep: initialData?.timeStep || "",
    initialConditions: initialData?.initialConditions || false,
  });

  const [transSimConfig, setTransSimConfig] = useState(""); // Changed from dcSimConfig to transSimConfig

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
    console.log("Transient Config: initialData changed:", initialData); // Debug logging

    isUpdatingFromExternalDataRef.current = true; // Set flag before updating

    if (initialData) {
      setFormData({
        stopTime: initialData.stopTime || "",
        timeStep: initialData.timeStep || "",
        initialConditions: initialData.initialConditions || false,
      });
      nameRef.current = initialData.name;
    } else {
      // Clear form when no initial data (e.g., when switching from another config type)
      setFormData({
        stopTime: "",
        timeStep: "",
        initialConditions: false,
      });
      nameRef.current = undefined;
    }
    // Flag will be reset in the next useEffect
  }, [initialData]);

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.tran ${formData.timeStep} ${formData.stopTime}`;
    setTransSimConfig(combined);

    // Skip callbacks if we're updating from external data to prevent infinite loops
    if (isUpdatingFromExternalDataRef.current) {
      isUpdatingFromExternalDataRef.current = false; // Reset the flag
      return;
    }

    // Call the callback with the updated config using ref to prevent focus loss
    if (onConfigChangeRef.current) {
      onConfigChangeRef.current(combined);
    }

    // Call the full config callback with complete Transient configuration using ref to prevent focus loss
    if (
      onFullConfigChangeRef.current &&
      formData.timeStep &&
      formData.stopTime
    ) {
      const fullConfig: SimulationTransient = {
        type: "Transient",
        name: nameRef.current, // Use the ref to preserve user-edited names
        timeStep: formData.timeStep, // Keep as string to support unit postfixes
        stopTime: formData.stopTime, // Keep as string to support unit postfixes
        initialConditions: formData.initialConditions,
      };
      onFullConfigChangeRef.current(fullConfig);
    }
  }, [formData]); // Removed onConfigChange from dependencies to prevent focus loss issues

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <Fieldset.Root size="lg" maxW="md">
        <Stack>
          <Fieldset.Legend>Transient Simulation Configuration</Fieldset.Legend>
          <Text
            fontSize="sm"
            color="gray.600"
            p={2}
            bg="gray.50"
            borderRadius="md"
          >
            Combined Config: {transSimConfig}
          </Text>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>Stop Time (s)</Field.Label>
            <Input
              name="stopTime"
              value={formData.stopTime}
              onChange={(e) => handleInputChange("stopTime", e.target.value)}
              placeholder="e.g., 1, 100m, 1u, 10n"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Time Step (s)</Field.Label>
            <Input
              name="timeStep"
              value={formData.timeStep}
              onChange={(e) => handleInputChange("timeStep", e.target.value)}
              placeholder="e.g., 0.01, 1m, 100u, 1n"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Use Initial Conditions</Field.Label>
            <Input
              name="initialConditions"
              type="checkbox"
              checked={formData.initialConditions}
              onChange={(e) =>
                handleInputChange("initialConditions", e.target.checked)
              }
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default TransConfig;
