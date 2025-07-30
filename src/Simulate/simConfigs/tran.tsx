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
  // Refs for uncontrolled inputs to prevent re-renders on typing
  const stopTimeRef = useRef<HTMLInputElement>(null);
  const timeStepRef = useRef<HTMLInputElement>(null);

  // Derived combined config string (no state to avoid extra renders causing focus loss)
  const combinedConfig = `.tran ${formData.timeStep} ${formData.stopTime}`;

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
        formData.stopTime === initialData.stopTime &&
        formData.timeStep === initialData.timeStep &&
        formData.initialConditions === initialData.initialConditions;
      if (same) return; // No real change, skip resetting
      // External update: sync formData and nameRef
      console.log("Transient Config: external initialData sync:", initialData); // Debug logging
      isUpdatingFromExternalDataRef.current = true;
      setFormData({
        stopTime: initialData.stopTime || "",
        timeStep: initialData.timeStep || "",
        initialConditions: initialData.initialConditions || false,
      });
      nameRef.current = initialData.name;
    } else {
      // If clearing when switching off this config type, only clear if fields not already empty
      if (
        formData.stopTime !== "" ||
        formData.timeStep !== "" ||
        formData.initialConditions !== false
      ) {
        console.log("Transient Config: clearing formData"); // Debug logging
        isUpdatingFromExternalDataRef.current = true;
        setFormData({ stopTime: "", timeStep: "", initialConditions: false });
        nameRef.current = undefined;
      }
    }
    // Flag will be reset in the next effect
  }, [initialData]);

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
            Combined Config: {combinedConfig}
          </Text>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>Stop Time (s)</Field.Label>
            <Input
              name="stopTime"
              defaultValue={formData.stopTime}
              ref={stopTimeRef}
              onBlur={() => {
                const value = stopTimeRef.current?.value || "";
                // Update state once on blur to avoid re-render during typing
                setFormData((prev) => ({ ...prev, stopTime: value }));
                onConfigChangeRef.current?.(
                  `.tran ${formData.timeStep} ${value}`
                );
                if (
                  onFullConfigChangeRef.current &&
                  formData.timeStep &&
                  value
                ) {
                  const fullConfig: SimulationTransient = {
                    type: "Transient",
                    name: nameRef.current,
                    timeStep: formData.timeStep,
                    stopTime: value,
                    initialConditions: formData.initialConditions,
                  };
                  onFullConfigChangeRef.current(fullConfig);
                }
              }}
              placeholder="e.g., 1, 100m, 1u, 10n"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Time Step (s)</Field.Label>
            <Input
              name="timeStep"
              defaultValue={formData.timeStep}
              ref={timeStepRef}
              onBlur={() => {
                const value = timeStepRef.current?.value || "";
                setFormData((prev) => ({ ...prev, timeStep: value }));
                onConfigChangeRef.current?.(
                  `.tran ${value} ${formData.stopTime}`
                );
                if (
                  onFullConfigChangeRef.current &&
                  value &&
                  formData.stopTime
                ) {
                  const fullConfig: SimulationTransient = {
                    type: "Transient",
                    name: nameRef.current,
                    timeStep: value,
                    stopTime: formData.stopTime,
                    initialConditions: formData.initialConditions,
                  };
                  onFullConfigChangeRef.current(fullConfig);
                }
              }}
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
