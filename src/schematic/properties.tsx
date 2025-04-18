"use client";

import {
  CloseButton,
  Field,
  Flex,
  Float,
  Input,
  Span,
  Stack,
} from "@chakra-ui/react";
import React from "react";

type PropertiesProps = {
  onCloseButtonClick: () => void;
};

const Properties: React.FC<PropertiesProps> = ({ onCloseButtonClick }) => {
  return (
    <Float offset="10rem" placement="middle-end">
      <Flex
        direction="column"
        bg="gray.900"
        padding={1.5}
        borderRadius="md"
        width="15rem"
      >
        <Flex alignItems="end" width={"100%"} justify="flex-end">
          <CloseButton onClick={onCloseButtonClick} />
        </Flex>
        <Flex width={"100%"} padding={1}>
          <Stack gap="3" maxW="sm">
            <Span>Properties</Span>
            <Field.Root>
              <Field.Label>Name</Field.Label>
              <Input placeholder="John Doe" />
            </Field.Root>

            <Field.Root>
              <Field.Label>Email</Field.Label>
              <Input placeholder="me@example.com" value={"10k"} />
            </Field.Root>
          </Stack>
        </Flex>
      </Flex>
    </Float>
  );
};

export default Properties;
