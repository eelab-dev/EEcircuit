import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
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

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.trans ${formData.timeStep} ${formData.stopTime}`;
    setTransSimConfig(combined);

    // Call the callback with the updated config
    if (onConfigChange) {
      onConfigChange(combined);
    }

    // Call the full config callback with complete Transient configuration
    if (onFullConfigChange && formData.timeStep && formData.stopTime) {
      const fullConfig: SimulationTransient = {
        type: "Transient",
        timeStep: formData.timeStep, // Keep as string to support unit postfixes
        stopTime: formData.stopTime, // Keep as string to support unit postfixes
        initialConditions: formData.initialConditions,
      };
      onFullConfigChange(fullConfig);
    }
  }, [formData, onConfigChange, onFullConfigChange]);

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
