import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { SimulationDC } from "../../types/commonTypes";

interface DcConfigProps {
  onConfigChange: (config: string) => void;
  initialData?: SimulationDC;
}

const DcConfig: React.FC<DcConfigProps> = ({ onConfigChange, initialData }) => {
  const [formData, setFormData] = useState({
    source: initialData?.source || "",
    start: initialData?.start?.toString() || "",
    stop: initialData?.stop?.toString() || "",
    step: initialData?.step?.toString() || "",
  });

  const [dcSimConfig, setDcSimConfig] = useState("");

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.dc ${formData.source} ${formData.start} ${formData.stop} ${formData.step}`;
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
              type="number"
              value={formData.start}
              onChange={(e) => handleInputChange("start", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Stop Value (V)</Field.Label>
            <Input
              name="stop"
              type="number"
              value={formData.stop}
              onChange={(e) => handleInputChange("stop", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Step size (V)</Field.Label>
            <Input
              name="step"
              type="number"
              value={formData.step}
              onChange={(e) => handleInputChange("step", e.target.value)}
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default DcConfig;
