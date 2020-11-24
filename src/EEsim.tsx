import React, { useState, useEffect, useRef } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";

import Plot from "./plot";
import DisplayBox from "./box";
import type { ResultType, VariableType } from "./sim/readOutput";
import DownCSV from "./downCSV";

import { Box, ChakraProvider, Divider, Textarea, useColorMode } from "@chakra-ui/react";
import { Button, ButtonGroup } from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";

let sim: Simulation;

export type DisplayDataType = {
  name: string;
  index: number; //result index
  visible: boolean;
};

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [simLoaded, setSimLoaded] = React.useState(false);
  const [results, setResults] = React.useState<ResultType>({
    param: {
      varNum: 0,
      pointNum: 0,
      variables: [{ name: "", type: "time" }] as VariableType[],
    },
    header: "",
    data: [],
  });
  const [netList, setNetList] = React.useState(circuits.bsimTrans);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>([]);

  /*useEffect(() => {
    sim = new Simulation();
    console.log(sim);

    sim.start();
  }, []);*/

  useEffect(() => {
    if (simLoaded) {
      sim.setOutputEvent(() => {
        console.log("🚀", sim.getResults());
        setResults(sim.getResults());
        //const dd = makeDD(sim.getResults());
        //setDisplayData(dd);
      });
    }
  }, [simLoaded, results]);

  //DisplayData logic
  useEffect(() => {
    const newDD = makeDD(results);
    let tempDD = [] as DisplayDataType[];
    newDD.forEach((newData, i) => {
      let match = false;
      let visible = true;
      displayData.forEach((oldData) => {
        if (newData.name == oldData.name) {
          match = true;
          visible = oldData.visible;
        }
      });
      if (match) {
        tempDD.push({ name: newData.name, index: newData.index, visible: visible });
      } else {
        tempDD.push({ name: newData.name, index: newData.index, visible: true });
      }
    });
    console.log("makeDD->", tempDD);
    setDisplayData([...tempDD]);

    //??????????????????????????????????????????????????doesn't change when changing circiut
  }, [results]);

  const makeDD = (res: ResultType): DisplayDataType[] => {
    let dd = [] as DisplayDataType[];
    res.param.variables.forEach((e, i) => {
      if (i > 0) {
        dd.push({ name: e.name, index: i, visible: true });
      }
    });
    console.log("makeDD->", dd);
    return dd;
  };

  const btPlot = () => {
    if (sim) {
      sim.setNetList(netList);
      sim.runSim();
    } else {
      sim = new Simulation();
      console.log(sim);
      sim.start();
      console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
      btPlot();
      setSimLoaded(true);
    }
  };

  const btInfo = () => {};

  const btCSV = () => {};

  const change = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;

      //index 0 is time

      const dd = displayData;

      dd.forEach((e) => {
        if (e.name == name) {
          e.visible = event.target.checked;
          console.log("change->", e, name);
        }
      });
      //console.log("change->", dd);

      setDisplayData([...dd]);
    },
    [displayData]
  );

  const btStyle = {
    borderRadius: "0.3em",
    border: "none",
    padding: "1em 2em",
    backgroundColor: "#0070f3",
    color: "white",
    cursor: "pointer",
    marginRight: "0.5em",
    fontSize: "1em",
  } as React.CSSProperties;

  const config = {
    useSystemColorMode: false,
    initialColorMode: "dark",
  };

  const customTheme = extendTheme({ config });

  return (
    <ChakraProvider theme={customTheme}>
      <div>
        <div style={{ display: "flex", width: "100%" }}>
          <Textarea
            bg="gray.900"
            fontSize="0.9em"
            rows={15}
            value={netList}
            onChange={(e) => {
              setNetList(e.target.value);
            }}
            spellCheck={false}
          />
          <div style={{ width: "30%", marginLeft: "5%" }}>
            <DisplayBox displayData={displayData} onChange={change} />
          </div>
        </div>
        <Box p={4}>
          <ButtonGroup variant="outline" spacing="4">
            <Button colorScheme="blue" variant="solid" size="lg" onClick={btPlot}>
              Plot 📈
            </Button>
            <Button colorScheme="blue" variant="solid" size="lg" onClick={btInfo}>
              Info 📄
            </Button>
            <Button colorScheme="blue" variant="solid" size="lg" onClick={btCSV}>
              CSV
            </Button>
          </ButtonGroup>
        </Box>

        <div>
          <Plot results={results} displayData={displayData} />
        </div>
      </div>
    </ChakraProvider>
  );
}
