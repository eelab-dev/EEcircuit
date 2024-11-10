import { Box, CheckboxGroup, Stack } from "@chakra-ui/react";
import React, { JSX } from "react";
import type { DisplayDataType } from "./displayData.ts";
import { Checkbox } from "./components/ui/checkbox.tsx";
import type { CheckboxCheckedChangeDetails } from "@chakra-ui/react";


type Props = {
  displayData: DisplayDataType[];
  checkCallBack: (name: string, check: boolean) => void;
};

function DisplayBox({ displayData, checkCallBack }: Props): JSX.Element {
  //const list = results.param.variables;
  const list = displayData;

  /*if (list.length == results.param.varNum) {
    list.shift();
  }*/

  console.log("I am here");

  const boxStyle = {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    backgroundColor: "rgb(30,30,30)",
    padding: "1em",
  } as React.CSSProperties;

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      maxW="sm"
      p={4}
      bg="gray.700"
      width="80%"
      maxHeight="25vh"
      overflowY="scroll"
    >
      <Stack direction="column">
        <CheckboxGroup onValueChange={console.log}>
          {list.map((dd, i) => (
            <Checkbox
              key={dd.name}
              onCheckedChange={(e: CheckboxCheckedChangeDetails) =>
                checkCallBack(dd.name, e.checked == true ? true : false)}
              name={dd.name}
              checked={dd.visible}
              color={dd.color
                ? `rgb(${dd.color.r * 255},${dd.color.g * 255},${
                  dd.color.b * 255
                })`
                : `rgb(200,200,200)`}
            >
              {dd.name}
            </Checkbox>
          ))}
        </CheckboxGroup>
      </Stack>
    </Box>
  );
}

//export default React.memo(DisplayBox);
//don't use memo and see why it returns empty?
//export default React.memo(DisplayBox);
export default DisplayBox;
