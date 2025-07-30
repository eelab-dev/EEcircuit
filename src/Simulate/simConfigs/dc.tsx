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

  // Derived combined config string (no state to avoid extra renders causing focus loss)
  const combinedConfig = `.dc ${formData.source} ${formData.start} ${formData.stop} ${formData.step}`;

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
    // Sync formData only when initialData truly differs to avoid resetting during typing
    if (initialData) {
      const same =
        formData.source === initialData.source &&
        formData.start === initialData.start &&
        formData.stop === initialData.stop &&
        formData.step === initialData.step;
      if (same) return;
      console.log("DC Config: external initialData sync:", initialData); // Debug logging
      isUpdatingFromExternalDataRef.current = true;
      setFormData({
        source: initialData.source || "",
        start: initialData.start || "",
        stop: initialData.stop || "",
        step: initialData.step || "",
      });
      nameRef.current = initialData.name;
    } else {
      const isEmpty =
        formData.source === "" &&
        formData.start === "" &&
        formData.stop === "" &&
        formData.step === "";
      if (isEmpty) return;
      console.log("DC Config: clearing formData"); // Debug logging
      isUpdatingFromExternalDataRef.current = true;
      setFormData({ source: "", start: "", stop: "", step: "" });
      nameRef.current = undefined;
    }
    // Flag will be reset in the next effect
  }, [initialData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  // Notify parent callbacks after user finishes editing (on blur) to avoid focus loss
  const handleBlur = () => {
    // Notify parent of combined config string
    onConfigChangeRef.current?.(combinedConfig);
    // Notify parent of full config if all fields are set
    if (
      onFullConfigChangeRef.current &&
      formData.source &&
      formData.start &&
      formData.stop &&
      formData.step
    ) {
      const fullConfig: SimulationDC = {
        type: "DC",
        name: nameRef.current,
        source: formData.source,
        start: formData.start,
        stop: formData.stop,
        step: formData.step,
      };
      onFullConfigChangeRef.current(fullConfig);
    }
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
            Combined Config: {combinedConfig}
          </Text>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>Sweep Source</Field.Label>
            <Input
              name="source"
              value={formData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              onBlur={handleBlur}
              placeholder="Source name (e.g., V1, I1)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Start Value (V)</Field.Label>
            <Input
              name="start"
              value={formData.start}
              onChange={(e) => handleInputChange("start", e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g., 0, 1m, 5.2"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Stop Value (V)</Field.Label>
            <Input
              name="stop"
              value={formData.stop}
              onChange={(e) => handleInputChange("stop", e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g., 10, 1.5k, 2M"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Step size (V)</Field.Label>
            <Input
              name="step"
              value={formData.step}
              onChange={(e) => handleInputChange("step", e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g., 0.1, 10m, 1k"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default DcConfig;
