import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React from "react";
import { SimulationDC } from "../../types/commonTypes";
import { useBaseSimConfig, BaseSimConfigProps, BaseSimConfigState, BaseSimConfigMethods } from "./BaseSimConfig";

interface DcFormData extends BaseSimConfigState {
  source: string;
  start: string;
  stop: string;
  step: string;
}

const dcConfigMethods: BaseSimConfigMethods<SimulationDC, DcFormData> = {
  generateConfigString: (formData: DcFormData) => {
    return `.dc ${formData.source} ${formData.start} ${formData.stop} ${formData.step}`;
  },

  generateFullConfig: (formData: DcFormData, name?: string): SimulationDC => {
    return {
      type: "DC",
      name,
      source: formData.source,
      start: formData.start,
      stop: formData.stop,
      step: formData.step,
    };
  },

  validateConfig: (formData: DcFormData): boolean => {
    return !!(
      formData.source?.toString().trim() &&
      formData.start?.toString().trim() &&
      formData.stop?.toString().trim() &&
      formData.step?.toString().trim()
    );
  },

  getInitialFormData: (initialData?: SimulationDC): DcFormData => {
    return {
      source: initialData?.source || "",
      start: initialData?.start || "",
      stop: initialData?.stop || "",
      step: initialData?.step || "",
    };
  }
};

const DcConfig: React.FC<BaseSimConfigProps<SimulationDC>> = (props) => {
  const { formData, handleInputChange, configString } = useBaseSimConfig<SimulationDC, DcFormData>(props, dcConfigMethods);
  const dcFormData = formData;

  return (
    <div>
      <Fieldset.Root size="sm" maxW="md">
        <Stack gap={2}>
          <Fieldset.Legend fontSize="sm">DC Simulation</Fieldset.Legend>
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
            <Field.Label fontSize="sm">Sweep Source</Field.Label>
            <Input
              size="sm"
              name="source"
              value={dcFormData.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              placeholder="e.g., V1, I1"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Start Value</Field.Label>
            <Input
              size="sm"
              name="start"
              value={dcFormData.start}
              onChange={(e) => handleInputChange("start", e.target.value)}
              placeholder="e.g., 0, 1m"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Stop Value</Field.Label>
            <Input
              size="sm"
              name="stop"
              value={dcFormData.stop}
              onChange={(e) => handleInputChange("stop", e.target.value)}
              placeholder="e.g., 10, 1.5k"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm">Step Size</Field.Label>
            <Input
              size="sm"
              name="step"
              value={dcFormData.step}
              onChange={(e) => handleInputChange("step", e.target.value)}
              placeholder="e.g., 0.1, 10m"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default DcConfig;
