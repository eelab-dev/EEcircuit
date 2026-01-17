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
import { SimulationNoise } from "../../types/commonTypes";
import { useBaseSimConfig, BaseSimConfigProps, BaseSimConfigState, BaseSimConfigMethods } from "./BaseSimConfig";

interface NoiseFormData extends BaseSimConfigState {
  netName: string;
  source: string;
  steps: string;
  startFreq: string;
  stopFreq: string;
  sweepType: "dec" | "oct" | "lin";
}

const noiseConfigMethods: BaseSimConfigMethods<SimulationNoise, NoiseFormData> = {
  generateConfigString: (formData: NoiseFormData) => {
    return `.noise v(${formData.netName}) ${formData.source} ${formData.sweepType} ${formData.steps} ${formData.startFreq} ${formData.stopFreq}`;
  },

  generateFullConfig: (formData: NoiseFormData, name?: string): SimulationNoise => {
    return {
      type: "Noise",
      name,
      netName: formData.netName,
      source: formData.source,
      steps: formData.steps,
      startFreq: formData.startFreq,
      stopFreq: formData.stopFreq,
      sweepType: formData.sweepType,
    };
  },

  validateConfig: (formData: NoiseFormData): boolean => {
    return !!(
      formData.netName?.trim() &&
      formData.source?.trim() &&
      formData.steps?.trim() &&
      formData.startFreq?.trim() &&
      formData.stopFreq?.trim()
    );
  },

  getInitialFormData: (initialData?: SimulationNoise): NoiseFormData => {
    return {
      netName: initialData?.netName || "",
      source: initialData?.source || "",
      steps: initialData?.steps || "",
      startFreq: initialData?.startFreq || "",
      stopFreq: initialData?.stopFreq || "",
      sweepType: initialData?.sweepType || "dec",
    };
  }
};

// ... (imports)

const NoiseConfig: React.FC<BaseSimConfigProps<SimulationNoise>> = (props) => {
  const { formData, handleInputChange, configString, detectedSources, detectedNets } = useBaseSimConfig<SimulationNoise, NoiseFormData>(props, noiseConfigMethods);
  const idPrefix = React.useId();
  const fieldIds = {
    netName: `${idPrefix}-netName`,
    source: `${idPrefix}-source`,
    sweepType: `${idPrefix}-sweep-type`,
    steps: `${idPrefix}-steps`,
    startFreq: `${idPrefix}-start-freq`,
    stopFreq: `${idPrefix}-stop-freq`,
  };

  return (
    <div>
      <Fieldset.Root size="sm" maxW="md">
        <Stack gap={2}>
          <Fieldset.Legend fontSize="sm">Noise Simulation</Fieldset.Legend>
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
            <Field.Label fontSize="sm" htmlFor={fieldIds.netName}>
              Output Net Name
            </Field.Label>
            {detectedNets && detectedNets.length > 0 ? (
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  id={fieldIds.netName}
                  value={formData.netName}
                  onChange={(e) => handleInputChange("netName", e.target.value)}
                >
                  <option value="">Select a net...</option>
                  {detectedNets.map((net) => (
                    <option key={net} value={net}>
                      {net}
                    </option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
            ) : (
              <Input
                size="sm"
                id={fieldIds.netName}
                name="netName"
                value={formData.netName}
                onChange={(e) => handleInputChange("netName", e.target.value)}
                placeholder="e.g., n001"
              />
            )}
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.source}>
              Input Source
            </Field.Label>
            {detectedSources.length > 0 ? (
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  id={fieldIds.source}
                  value={formData.source}
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
                value={formData.source}
                onChange={(e) => handleInputChange("source", e.target.value)}
                placeholder="e.g., V1"
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
                value={formData.sweepType}
                onChange={(e) => {
                  handleInputChange(
                    "sweepType",
                    e.target.value as SimulationNoise["sweepType"]
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
            <Field.Label fontSize="sm" htmlFor={fieldIds.steps}>
               Steps
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.steps}
              name="steps"
              value={formData.steps}
              onChange={(e) => handleInputChange("steps", e.target.value)}
               placeholder="e.g., 10"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.startFreq}>
              Start Frequency
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.startFreq}
              name="startFreq"
              value={formData.startFreq}
              onChange={(e) =>
                handleInputChange("startFreq", e.target.value)
              }
              placeholder="e.g., 10"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.stopFreq}>
              Stop Frequency
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.stopFreq}
              name="stopFreq"
              value={formData.stopFreq}
              onChange={(e) =>
                handleInputChange("stopFreq", e.target.value)
              }
               placeholder="e.g., 100k"
            />
          </Field.Root>

        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default NoiseConfig;
