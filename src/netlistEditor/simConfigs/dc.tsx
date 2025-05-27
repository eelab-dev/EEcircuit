import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

const DcConfig: React.FC = () => {
  const [formData, setFormData] = useState({
    dcSource: "",
    dcStart: "",
    dcEnd: "",
    dcStep: "",
  });

  const [combinedString, setCombinedString] = useState("");

  // Update combined string whenever form data changes
  useEffect(() => {
    const combined = `.dc: ${formData.dcSource} ${formData.dcStart} ${formData.dcEnd} ${formData.dcStep}`;
    setCombinedString(combined);
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputCapture = (e: React.SyntheticEvent) => {
    console.log("Input captured:", e);
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
            Combined Config: {combinedString}
          </Text>
        </Stack>

        <Fieldset.Content
          onInputCapture={(e) => {
            handleInputCapture(e);
          }}
        >
          <Field.Root>
            <Field.Label>Sweep Source</Field.Label>
            <Input
              name="dcSource"
              value={formData.dcSource}
              onChange={(e) => handleInputChange("dcSource", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Start Value (V)</Field.Label>
            <Input
              name="dcStart"
              value={formData.dcStart}
              onChange={(e) => handleInputChange("dcStart", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>End Value (V)</Field.Label>
            <Input
              name="dcEnd"
              value={formData.dcEnd}
              onChange={(e) => handleInputChange("dcEnd", e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Step size (V)</Field.Label>
            <Input
              name="dcStep"
              value={formData.dcStep}
              onChange={(e) => handleInputChange("dcStep", e.target.value)}
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default DcConfig;
