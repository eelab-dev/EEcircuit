import {
  Field,
  Fieldset,
  Input,
  Stack,
  Text,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";
import React from "react";
import { SimulationAC } from "../../types/commonTypes";
import { useBaseSimConfig, BaseSimConfigProps, BaseSimConfigState, BaseSimConfigMethods } from "./BaseSimConfig";

interface AcFormData extends BaseSimConfigState {
  source: string;
  frequencyStart: string;
  frequencyStop: string;
  stepNumber: string;
  sweepType: "dec" | "oct" | "lin";
}

const acConfigMethods: BaseSimConfigMethods<SimulationAC, AcFormData> = {
  generateConfigString: (formData: AcFormData) => {
    return `.ac ${formData.sweepType} ${formData.stepNumber} ${formData.frequencyStart} ${formData.frequencyStop}`;
  },

  generateFullConfig: (formData: AcFormData, name?: string): SimulationAC => {
    return {
      type: "AC",
      name,
      source: formData.source,
      frequencyStart: formData.frequencyStart,
      frequencyStop: formData.frequencyStop,
      stepNumber: formData.stepNumber,
      sweepType: formData.sweepType,
    };
  },

  validateConfig: (formData: AcFormData): boolean => {
    return !!(
      formData.source?.toString().trim() &&
      formData.frequencyStart?.toString().trim() &&
      formData.frequencyStop?.toString().trim() &&
      formData.stepNumber?.toString().trim()
    );
  },

  getInitialFormData: (initialData?: SimulationAC): AcFormData => {
    return {
      source: initialData?.source || "",
      frequencyStart: initialData?.frequencyStart || "",
      frequencyStop: initialData?.frequencyStop || "",
      stepNumber: initialData?.stepNumber || "",
      sweepType: initialData?.sweepType || "lin",
    };
  }
};

const AcConfig: React.FC<BaseSimConfigProps<SimulationAC>> = (props) => {
  const { formData, handleInputChange, configString } = useBaseSimConfig<SimulationAC, AcFormData>(props, acConfigMethods);
  const acFormData = formData;

  return (
    <div>
      <Fieldset.Root size="sm" maxW="md">
        <Stack gap={2}>
          <Fieldset.Legend fontSize="sm">AC Simulation</Fieldset.Legend>
          <Text
            fontSize="xs"
            color="gray.600"
            p={1}
            bg="gray.50"
            borderRadius="md"
          >
            {configString}
          </Text>
        </Stack>

        <Fieldset.Content gap={2}>
          <Field.Root>
            <Field.Label fontSize="sm">Source</Field.Label>
            <Input
              size="sm"
              name="source"
              value={acFormData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              placeholder="e.g., V1, I1"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Sweep Type</Field.Label>
            <NativeSelectRoot size="sm">
              <NativeSelectField
                value={acFormData.sweepType}
                onChange={(e) => {
                  handleInputChange(
                    "sweepType",
                    e.target.value as SimulationAC["sweepType"]
                  );
                }}
              >
                <option value="dec">Decade</option>
                <option value="oct">Octave</option>
                <option value="lin">Linear</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Start Frequency</Field.Label>
            <Input
              size="sm"
              name="frequencyStart"
              value={acFormData.frequencyStart}
              onChange={(e) =>
                handleInputChange("frequencyStart", e.target.value)
              }
              placeholder="e.g., 1, 10k"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Stop Frequency</Field.Label>
            <Input
              size="sm"
              name="frequencyStop"
              value={acFormData.frequencyStop}
              onChange={(e) =>
                handleInputChange("frequencyStop", e.target.value)
              }
              placeholder="e.g., 1M, 2G"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Steps Number</Field.Label>
            <Input
              size="sm"
              name="stepNumber"
              value={acFormData.stepNumber}
              onChange={(e) => handleInputChange("stepNumber", e.target.value)}
              placeholder="e.g., 10, 100, 1k"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default AcConfig;