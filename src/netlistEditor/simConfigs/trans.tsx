import { Field, Fieldset, Input, Stack } from "@chakra-ui/react";
import React from "react";

const TransConfig: React.FC = () => {
  return (
    <div>
      <Fieldset.Root size="lg" maxW="md">
        <Stack>
          <Fieldset.Legend>Transient Simulation Configuration</Fieldset.Legend>
        </Stack>

        <Fieldset.Content>
          <Field.Root>
            <Field.Label>End time (s)</Field.Label>
            <Input name="transTime" />
          </Field.Root>

          <Field.Root>
            <Field.Label>Suggested timestep (s)</Field.Label>
            <Input name="transStep" />
          </Field.Root>
        </Fieldset.Content>
      </Fieldset.Root>
    </div>
  );
};
export default TransConfig;
