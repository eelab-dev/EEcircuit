import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { SimulationAC } from "../../types/commonTypes";

interface AcConfigProps {
  onConfigChange: (config: string) => void;
  initialData?: SimulationAC;
}

const AcConfig: React.FC<AcConfigProps> = ({ onConfigChange, initialData }) => {
  const [formData, setFormData] = useState({
    source: initialData?.source || "",
    frequencyStart: initialData?.frequencyStart?.toString() || "",
    frequencyStop: initialData?.frequencyStop?.toString() || "",
    frequencyStep: initialData?.frequencyStep?.toString() || "",
    sweepType: initialData?.sweepType || ("lin" as "lin" | "log" | "dec"),
  });

  const [acSimConfig, setAcSimConfig] = useState("");

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.ac ${formData.sweepType} ${formData.frequencyStart} ${formData.frequencyStop} ${formData.frequencyStep}`;
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
            <Field.Label>Source</Field.Label>
            <Input
              name="source"
              value={formData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              placeholder="Source name (e.g., V1, I1)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Sweep Type</Field.Label>
            <Input
              name="sweepType"
              value={formData.sweepType}
              onChange={(e) =>
                handleInputChange(
                  "sweepType",
                  e.target.value as "lin" | "log" | "dec"
                )
              }
              placeholder="lin, log, or dec"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Start Frequency (Hz)</Field.Label>
            <Input
              name="frequencyStart"
              type="number"
              value={formData.frequencyStart}
              onChange={(e) =>
                handleInputChange("frequencyStart", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Stop Frequency (Hz)</Field.Label>
            <Input
              name="frequencyStop"
              type="number"
              value={formData.frequencyStop}
              onChange={(e) =>
                handleInputChange("frequencyStop", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Frequency Step (Hz)</Field.Label>
            <Input
              name="frequencyStep"
              type="number"
              value={formData.frequencyStep}
              onChange={(e) =>
                handleInputChange("frequencyStep", e.target.value)
              }
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default AcConfig;
