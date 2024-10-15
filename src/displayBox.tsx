import { Box, Checkbox, Stack } from "@chakra-ui/react";
import React, { JSX } from "react";
import type { DisplayDataType } from "./displayData.ts";

type Props = {
  displayData: DisplayDataType[];
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function DisplayBox({ displayData, onChange }: Props): JSX.Element {
  //const list = results.param.variables;
  const list = displayData;

  /*if (list.length == results.param.varNum) {
    list.shift();
  }*/

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
      <Stack spacing={1} direction="column">
        {list.map((e, i) => (
          <Checkbox
            key={e.index}
            onChange={onChange}
            name={e.name}
            isChecked={e.visible}
            color={e.color
              ? `rgb(${e.color.r * 255},${e.color.g * 255},${e.color.b * 255})`
              : `rgb(200,200,200)`}
          >
            {e.name}
          </Checkbox>
          /*<div key={e.index}>
          <input
            type="checkbox"
            name={e.name}
            key={e.index}
            onChange={onChange}
            defaultChecked={true}></input>
          <label> {e.name}</label>
        </div>*/
        ))}
      </Stack>
    </Box>
  );
}

//export default React.memo(DisplayBox);
//don't use memo and see why it returns empty?
export default React.memo(DisplayBox);
