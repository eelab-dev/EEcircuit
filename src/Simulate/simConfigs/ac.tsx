import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

interface AcConfigProps {
  onConfigChange: (config: string) => void;
}

const AcConfig: React.FC<AcConfigProps> = ({ onConfigChange }) => {
  const [formData, setFormData] = useState({
    acSource: "",
    acStart: "",
    acEnd: "",
    acStep: "",
  });

  const [acSimConfig, setAcSimConfig] = useState("");

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.ac ${formData.acSource} ${formData.acStart} ${formData.acEnd} ${formData.acStep}`;
    setAcSimConfig(combined);

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
          <Fieldset.Legend>AC Simulation Configuration</Fieldset.Legend>
          <Text
            fontSize="sm"
            color="gray.600"
            p={2}
            bg="gray.50"
            borderRadius="md"
          >
            Combined Config: {acSimConfig}
          </Text>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>Sweep Source</Field.Label>
            <Input
              name="acSource"
              value={formData.acSource}
              onChange={(e) => handleInputChange("dcSource", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Start Frequency (Hz)</Field.Label>
            <Input
              name="acStart"
              value={formData.acStart}
              onChange={(e) => handleInputChange("dcStart", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>End Frequency (Hz)</Field.Label>
            <Input
              name="acEnd"
              value={formData.acEnd}
              onChange={(e) => handleInputChange("dcEnd", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Step size (Hz)</Field.Label>
            <Input
              name="acStep"
              value={formData.acStep}
              onChange={(e) => handleInputChange("dcStep", e.target.value)}
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default AcConfig;
