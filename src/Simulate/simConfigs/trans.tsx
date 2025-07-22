import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { SimulationTransient } from "../../types/commonTypes";

interface TransConfigProps {
  onConfigChange: (config: string) => void;
  initialData?: SimulationTransient;
}

const TransConfig: React.FC<TransConfigProps> = ({
  onConfigChange,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    stopTime: initialData?.stopTime?.toString() || "",
    timeStep: initialData?.timeStep?.toString() || "",
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
  }, [formData, onConfigChange]);

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
              type="number"
              value={formData.stopTime}
              onChange={(e) => handleInputChange("stopTime", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Time Step (s)</Field.Label>
            <Input
              name="timeStep"
              type="number"
              value={formData.timeStep}
              onChange={(e) => handleInputChange("timeStep", e.target.value)}
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
