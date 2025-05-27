import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

interface TransConfigProps {
  onConfigChange: (config: string) => void;
}

const TransConfig: React.FC<TransConfigProps> = ({ onConfigChange }) => {
  const [formData, setFormData] = useState({ transStart: "", transStep: "" });

  const [dcSimConfig, setDcSimConfig] = useState("");

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.trans ${formData.transStep} ${formData.transStart}`;
    setDcSimConfig(combined);

    // Call the callback with the updated config
    if (onConfigChange) {
      onConfigChange(combined);
    }
  }, [formData, onConfigChange]);

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
            <Field.Label>Transient End Time (s)</Field.Label>
            <Input
              name="transStart"
              value={formData.transStart}
              onChange={(e) => handleInputChange("transStart", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Suggsted timestep (s)</Field.Label>
            <Input
              name="transStep"
              value={formData.transStep}
              onChange={(e) => handleInputChange("transStep", e.target.value)}
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default TransConfig;
