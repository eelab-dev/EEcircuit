import { Field, Fieldset, Input, Stack, Text } from "@chakra-ui/react";
import React from "react";
import { SimulationTransient } from "../../types/commonTypes";
import { useBaseSimConfig, BaseSimConfigProps, BaseSimConfigState, BaseSimConfigMethods } from "./BaseSimConfig";

interface TranFormData extends BaseSimConfigState {
  stopTime: string;
  timeStep: string;
  initialConditions: boolean;
}

const tranConfigMethods: BaseSimConfigMethods<SimulationTransient, TranFormData> = {
  generateConfigString: (formData: TranFormData) => {
    return `.tran ${formData.timeStep} ${formData.stopTime}`;
  },

  generateFullConfig: (formData: TranFormData, name?: string): SimulationTransient => {
    return {
      type: "Transient",
      name,
      stopTime: formData.stopTime,
      timeStep: formData.timeStep,
      initialConditions: formData.initialConditions,
    };
  },

  validateConfig: (formData: TranFormData): boolean => {
    return !!(
      formData.stopTime?.toString().trim() &&
      formData.timeStep?.toString().trim()
    );
  },

  getInitialFormData: (initialData?: SimulationTransient): TranFormData => {
    return {
      stopTime: initialData?.stopTime || "",
      timeStep: initialData?.timeStep || "",
      initialConditions: initialData?.initialConditions || false,
    };
  }
};

const TransConfig: React.FC<BaseSimConfigProps<SimulationTransient>> = (props) => {
  const { formData, handleInputChange, configString } = useBaseSimConfig<SimulationTransient, TranFormData>(props, tranConfigMethods);
  const tranFormData = formData;
  const idPrefix = React.useId();
  const fieldIds = {
    stopTime: `${idPrefix}-stop-time`,
    timeStep: `${idPrefix}-time-step`,
  };

  return (
    <div>
      <Fieldset.Root size="sm" maxW="md">
        <Stack gap={2}>
          <Fieldset.Legend fontSize="sm">Transient Simulation</Fieldset.Legend>
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
            <Field.Label fontSize="sm" htmlFor={fieldIds.stopTime}>
              Stop Time
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.stopTime}
              name="stopTime"
              value={tranFormData.stopTime}
              onChange={(e) => handleInputChange("stopTime", e.target.value)}
              placeholder="e.g., 10n, 1m, 1"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" htmlFor={fieldIds.timeStep}>
              Time Step
            </Field.Label>
            <Input
              size="sm"
              id={fieldIds.timeStep}
              name="timeStep"
              value={tranFormData.timeStep}
              onChange={(e) => handleInputChange("timeStep", e.target.value)}
              placeholder="e.g., 1n, 10p, 1m"
            />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default TransConfig;
