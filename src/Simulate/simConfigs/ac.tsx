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
  const { formData, handleInputChange, configString, detectedSources } = useBaseSimConfig<SimulationAC, AcFormData>(props, acConfigMethods);
  const acFormData = formData;
  const idPrefix = React.useId();
  const fieldIds = {
    source: `${idPrefix}-source`,
    sweepType: `${idPrefix}-sweep-type`,
    frequencyStart: `${idPrefix}-frequency-start`,
    frequencyStop: `${idPrefix}-frequency-stop`,
    stepNumber: `${idPrefix}-step-number`,
  };

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
            <Field.Label fontSize="sm" htmlFor={fieldIds.source}>
              Source
            </Field.Label>
            {detectedSources.length > 0 ? (
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  id={fieldIds.source}
                  value={acFormData.source}
                  onChange={(e) => handleInputChange("source", e.target.value)}
                >
                  <option value="">Select a source...</option>
                  {detectedSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
            ) : (
              <Input
                size="sm"
                id={fieldIds.source}
                name="source"
                value={acFormData.source}
                onChange={(e) => handleInputChange("source", e.target.value)}
                placeholder="e.g., V1, I1 (no sources detected in netlist)"
              />
            )}
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.sweepType}>
              Sweep Type
            </Field.Label>
            <NativeSelectRoot size="sm">
              <NativeSelectField
                id={fieldIds.sweepType}
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
            <Field.Label fontSize="sm" htmlFor={fieldIds.frequencyStart}>
              Start Frequency
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.frequencyStart}
              name="frequencyStart"
              value={acFormData.frequencyStart}
              onChange={(e) =>
                handleInputChange("frequencyStart", e.target.value)
              }
              placeholder="e.g., 1, 10k"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.frequencyStop}>
              Stop Frequency
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.frequencyStop}
              name="frequencyStop"
              value={acFormData.frequencyStop}
              onChange={(e) =>
                handleInputChange("frequencyStop", e.target.value)
              }
              placeholder="e.g., 1M, 2G"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.stepNumber}>
              Steps Number
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.stepNumber}
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
