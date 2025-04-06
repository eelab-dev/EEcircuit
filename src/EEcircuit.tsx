"use client";
import React, { Suspense, useEffect, useState } from "react";
//import * as circuits from "./sim/circuits.ts";
//import { NumberInputValueChangeDetails } from "@chakra-ui/react";

//const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));
//const PlotArray = React.lazy(() => import("./plotArray.tsx"));
//const DisplayBox = React.lazy(() => import("./displayBox.tsx"));

//import PlotArray from "./plotArray.tsx";
//import DisplayBox from "./displayBox.tsx";
//import DownCSV from "./downCSV.tsx";

import { Box, Flex, Tabs, Text } from "@chakra-ui/react";

/*import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";  */

//import { Toaster, toaster } from "./components/ui/toaster.tsx";

//import { ProgressBar, ProgressRoot } from "./components/ui/progress.tsx";

//import { getColor } from "./colors.ts";
//import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray.ts";
//import { DisplayDataType, makeDD } from "./displayData.ts";

import Schematic from "./schematic/schematic.tsx";
import NetlistEditor from "./netlistEditor.tsx";
import { TabsValueChangeDetails } from "node_modules/@chakra-ui/react/dist/types/components/tabs/tabs";
import Logo from "./logo.tsx";

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

const EEcircuit: React.FC = () => {
  // Create the count state.

  //const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  //const [isSimLoading, setIsSimLoading] = React.useState(false);
  //const [isSimRunning, setIsSimRunning] = React.useState(false);
  //const [resultArray, setResultArray] = React.useState<ResultArrayType>();
  //const [info, setInfo] = React.useState("");
  const [netList, setNetList] = React.useState("");
  //const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabValue, setTabValue] = React.useState("schematic");
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

  /*useEffect(() => {
    // Simulate loading of other components
    setTimeout(() => {
      setComponentsLoaded(true);
    }, 10); // Adjust the timeout as needed
  }, []);*/

  const exportedNetlist = React.useCallback((netlist: string) => {
    const netListPreamble = `
* Netlist generated by EEcircuit
.include modelcard.CMOS90
`;
    const netListPostamble = `
.tran 0.1 50
.end
`;
    const netlistWithPreamble = netListPreamble + netlist + netListPostamble;
    setNetList(netlistWithPreamble);
    setTabValue("netlist");
  }, []);

  const handleTabValueChange = React.useCallback(
    (details: TabsValueChangeDetails) => {
      setTabValue(details.value);
    },
    []
  );

  return (
    <Box
      border="solid 0px"
      p={2}
      height={"100vh"}
      display={"flex"}
      flexDirection={"column"}
      flexGrow={0}
    >
      <Flex
        direction="row"
        alignItems={"self-end"}
        gapX={2}
        flex={1}
        flexGrow={0}
      >
        <Logo />
        <Text>a SPICE based circuit simulator</Text>
      </Flex>
      <Tabs.Root
        defaultValue="schematic"
        value={tabValue}
        onValueChange={handleTabValueChange}
        variant="subtle"
        display={"flex"}
        flexDirection="column"
        flex={1}
      >
        <Tabs.List flexShrink={0}>
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

        <Tabs.Content value="schematic" flex={1}>
          <Schematic onNetlistExported={exportedNetlist} />
        </Tabs.Content>

        <Tabs.Content value="netlist" flex={1}>
          <NetlistEditor netList={netList} />
        </Tabs.Content>

        <Tabs.Content value="plot" flex={1}>
          {/* <PlotArray
              resultArray={resultArray}
              displayData={displayData}
              colorMode={colorMode}
              sweep={sweep}
              info={info}
              progress={progress}
              threadCount={threadCount}
              setThreadCount={setThreadCountNew}
            /> */}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};

export default EEcircuit;
