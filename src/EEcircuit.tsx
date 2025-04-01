"use client";
import React, { JSX, Suspense, useEffect, useState } from "react";
//import * as circuits from "./sim/circuits.ts";
//import { NumberInputValueChangeDetails } from "@chakra-ui/react";

//const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));
//const PlotArray = React.lazy(() => import("./plotArray.tsx"));
//const DisplayBox = React.lazy(() => import("./displayBox.tsx"));

//import PlotArray from "./plotArray.tsx";
//import DisplayBox from "./displayBox.tsx";
//import DownCSV from "./downCSV.tsx";

import { Box, Flex, Tabs } from "@chakra-ui/react";

/*import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";  */

//import { Toaster, toaster } from "./components/ui/toaster.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
//import { ProgressBar, ProgressRoot } from "./components/ui/progress.tsx";

//import { getColor } from "./colors.ts";
//import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray.ts";
//import { DisplayDataType, makeDD } from "./displayData.ts";

import Schematic from "./schematic.tsx";
import EditorCustom from "./editor/editorCustom.tsx";
import { useColorModeValue } from "components/ui/color-mode.tsx";

//let sim: SimArray;
//const store = globalThis.localStorage;
//let initialSimInfo = "";
//let threadCount = 1;

/*const circuitDefault = `Basic RLC circuit 
.include modelcard.CMOS90

r vdd 2 100.0
l vdd 2 1
c vdd 2 0.01
m1 2 1 0 0 N90 W=100.0u L=0.09u
vdd vdd 0 1.8

vin 1 0 0 pulse (0 1.8 0 0.1 0.1 15 30)
.tran 0.1 50

.end`;*/

export default function EEcircuit(): JSX.Element {
  // Create the count state.

  //const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  //const [isSimLoading, setIsSimLoading] = React.useState(false);
  //const [isSimRunning, setIsSimRunning] = React.useState(false);
  //const [resultArray, setResultArray] = React.useState<ResultArrayType>();
  //const [info, setInfo] = React.useState("");
  //const [netList, setNetList] = React.useState(circuitDefault);
  //const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  //const [tabIndex, setTabIndex] = React.useState(0);
  //const [sweep, setSweep] = React.useState(false);
  //const [progress, setProgress] = React.useState(0);
  //const [threadCountNew, setThreadCountNew] = React.useState(1);

  //const colorMode = useColorModeValue("light", "dark");

  /*useEffect(() => {
    const loadedNetList = store.getItem("netList");
    setNetList(loadedNetList ? loadedNetList : circuitDefault);

    const loadedDisplayDataString = store.getItem("displayData");
    if (loadedDisplayDataString) {
      const loadedDisplayData = JSON.parse(
        loadedDisplayDataString
      ) as DisplayDataType[];
      setDisplayData(loadedDisplayData);
    }
  }, []);*/

  /*useEffect(() => {
    if (resultArray && resultArray.results.length > 1) {
      setSweep(true);
    }
  }, [resultArray]);*/

  /*useEffect(() => {
    const displayErrors = async () => {
      const errors = await sim.getError();
      errors.forEach((e) => {
        toaster.create({
          description: e,
          type: "error",
        });
      });
    };

    if (isSimLoaded) {
      displayErrors();
    }
  }, [isSimLoaded, resultArray]);

  useEffect(() => {
    //DisplayData logic
    if (resultArray && resultArray.results.length > 0) {
      const newDD = makeDD(resultArray.results[0], colorMode);
      const tempDD = [] as DisplayDataType[];
      newDD.forEach((newData, i) => {
        let match = false;
        let visible = true;
        let color = getColor(colorMode);

        if (displayData) {
          displayData.forEach((oldData) => {
            //account for new color type
            if (newData.name === oldData.name && oldData.color) {
              match = true;
              visible = oldData.visible;
              color = oldData.color;
            }
          });
          if (match) {
            tempDD.push({
              name: newData.name,
              index: newData.index,
              visible: visible,
              color: color,
            });
          } else {
            tempDD.push({
              name: newData.name,
              index: newData.index,
              visible: true,
              color: newData.color,
            });
          }
        } else {
          tempDD.push({
            name: newData.name,
            index: newData.index,
            visible: true,
            color: newData.color,
          });
        }
      });
      console.log("makeDD->", tempDD);
      setDisplayData([...tempDD]);
    }
  }, [resultArray]);*/

  /*const simOutputCallback = React.useCallback(async () => {
    //none of the React.State are accessible in the callback
    const res = await sim.getResults();
    console.log("🚀", res);
    setResults(res);
    setInfo(initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n" + res.header);
    setIsSimRunning(false);
  }, []);*/

  /*const btRun = async () => {
    if (sim && threadCount === threadCountNew) {
      setIsSimRunning(true);
      //setParser(getParser(netList));
      store.setItem("netList", netList);
      sim.setNetList(netList);
      const resultArray = await sim.runSim();
      setResultArray(resultArray);
      setInfo(initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n");
      setIsSimRunning(false);
    } else {
      //spawn worker thread
      console.log("sim is loading");
      setIsSimLoaded(false);
      setIsSimLoading(true);
      sim = new SimArray();
      threadCount = threadCountNew;
      await sim.init(threadCount);
      initialSimInfo = await sim.getInitInfo();
      sim.progressCallback = simProgressCallback;
      setIsSimLoaded(true);
      setIsSimLoading(false);
      setProgress(0);
      //initialSimInfo = await sim.getInfo(); //not yet working???????
      btRun();
    }
  };*/

  /*const simProgressCallback = React.useCallback((n: number) => {
    setProgress(n);
    console.log(n);
  }, []);*/

  /*const simProgressCallback = (n: number) => {
    setProgress(n);
    console.log(n);
  };*/

  /*const change = React.useCallback(
    (name: string, check: boolean) => {
      //const name = event;

      //index 0 is time

      if (isSimLoaded && displayData) {
        const dd = displayData;

        dd.forEach((dd) => {
          if (dd.name === name) {
            dd.visible = check;
            console.log("change->", check, name);
          }
        });
        console.log("change->", dd);

        setDisplayData([...dd]);
        const stringDD = JSON.stringify(dd);
        store.setItem("displayData", stringDD);
      }
    },
    [displayData, isSimLoaded]
  );*/

  /*const handleTabChange = (index: number) => {
    setTabIndex(index);
  };*/

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value) {
      //setNetList(value);
    }
  }, []);

  /*const handleDeSelectButton = React.useCallback(() => {
    if (displayData) {
      const disp = [...displayData];
      disp.forEach((e) => {
        e.visible = false;
      });
      setDisplayData(disp);
    }
  }, [displayData]);

  const handleSelectAllButton = React.useCallback(() => {
    if (displayData) {
      const disp = [...displayData];
      disp.forEach((e) => {
        e.visible = true;
      });
      setDisplayData(disp);
    }
  }, [displayData]);

  const btReset = React.useCallback(() => {
    setResultArray(undefined);
    setDisplayData(undefined);
    store.removeItem("displayData");
  }, []);*/

  /*const btColor = React.useCallback(() => {
    if (resultArray && displayData) {
      const d = [...displayData];
      if (!isComplex(resultArray)) {
        d.forEach((e) => {
          e.color = getColor(colorMode);
        });
      } else {
        for (let i = 0; i < d.length - 1; i = i + 2) {
          const c = getColor(colorMode);
          d[i].color = c;
          d[i + 1].color = c;
        }
      }

      setDisplayData(d);
      //setResultArray({results:[...results], sweep:[...resultArray.sweep]});
    }
  }, [displayData]);*/

  /*const LineSelectBox = (): JSX.Element => {
    return (
      <Box w={{ base: "100%", md: "30%" }} marginLeft="5%">
        <Suspense fallback={<Skeleton height="100px" />}>
          <Stack
            direction="row"
            gap={2}
            align="stretch"
            width="100%"
            marginBottom="0.5em"
          >
            <Button colorScheme="blue" onClick={handleSelectAllButton}>
              Select all
            </Button>
            <Button colorScheme="blue" onClick={handleDeSelectButton}>
              De-select all
            </Button>
          </Stack>
        </Suspense>
      </Box>
    );
  };*/

  //const { onOpen, onClose } = useDisclosure();
  /*const [open, setOpen] = useState(false);
  const handleThreadChange = (e: NumberInputValueChangeDetails) => {
    // const valueNumber = parseInt(e.value);
    setThreadCountNew(e.valueAsNumber);
  };

  const displayBreakpoint = useBreakpointValue({ base: "base", md: "md" });
  const [componentsLoaded, setComponentsLoaded] = useState(false);*/
  const [windowSize, setWindowSize] = useState({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });

  /*useEffect(() => {
    // Simulate loading of other components
    setTimeout(() => {
      setComponentsLoaded(true);
    }, 10); // Adjust the timeout as needed
  }, []);*/

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: globalThis.innerWidth,
        height: globalThis.innerHeight,
      });
    };

    globalThis.addEventListener("resize", handleResize);
    return () => {
      globalThis.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div>
      <Box border="solid 0px" p={2}>
        <Tabs.Root defaultValue="schematic">
          <Tabs.List>
            <Tabs.Trigger value="schematic" marginRight="0.5em">
              Schematic
            </Tabs.Trigger>
            <Tabs.Trigger value="netlist" marginRight="0.5em">
              Netlist
            </Tabs.Trigger>
            <Tabs.Trigger value="plot" marginRight="0.5em">
              Plot
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="schematic">
            <Schematic />
          </Tabs.Content>

          <Tabs.Content value="netlist">
            <Flex width="100%">
              <Suspense fallback={<Skeleton height="50vh" width="100%" />}>
                <EditorCustom
                  height="50vh"
                  width="100%"
                  language="spice"
                  value={""}
                  valueChanged={handleEditor}
                  theme={useColorModeValue("light", "dark")}
                  key={windowSize.width}
                />
              </Suspense>
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </div>
  );
}
