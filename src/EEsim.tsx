import React, { useEffect } from "react";
import type { simulation } from "./sim/simulationLink";
import * as circuits from "./sim/circuits";

import EditorCustom from "./editor/editorCustom";

import Plot from "./plot";
import DisplayBox from "./displayBox";
import type { ResultType, VariableType } from "./sim/readOutput";
import DownCSV from "./downCSV";

import * as Comlink from "comlink";

import {
  Box,
  ChakraProvider,
  Checkbox,
  color,
  createStandaloneToast,
  Divider,
  Flex,
  Spacer,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Button, ButtonGroup } from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";
import getParser, { ParserType } from "./parser";
import { calcContrast, calcLuminance } from "./calcContrast";

//let sim: Simulation;
let sim: Comlink.Remote<typeof simulation>;
const store = window.localStorage;

export type ColorType = {
  r: number;
  g: number;
  b: number;
};

export type DisplayDataType = {
  name: string;
  index: number; //result index
  color: ColorType;
  visible: boolean;
};

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  const [isSimRunning, setIsSimRunning] = React.useState(false);
  const [results, setResults] = React.useState<ResultType>();
  const [parser, setParser] = React.useState<ParserType>();
  const [netList, setNetList] = React.useState(circuits.bsimTrans);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabIndex, setTabIndex] = React.useState(0);

  //const toast = useToast();
  const toast = createStandaloneToast();

  useEffect(() => {
    const loadedNetList = store.getItem("netList");
    setNetList(loadedNetList ? loadedNetList : circuits.bsimTrans);

    const loadedDisplayDataString = store.getItem("displayData");
    if (loadedDisplayDataString) {
      const loadedDisplayData = JSON.parse(loadedDisplayDataString) as DisplayDataType[];
      setDisplayData(loadedDisplayData);
    }
  }, []);

  useEffect(() => {
    /*if (isSimLoaded) {
      sim.setOutputEvent(() => {
        console.log("🚀", await sim.getResults());
        const res = sim.getResults();
        //set the display data before results for coloring
        handleDisplayData(res);
        setResults(res);
      });
    }*/
  }, [isSimLoaded, results]);

  useEffect(() => {
    if (isSimLoaded) {
      const errors = sim.getError();
      /*errors.forEach((e) => {
        toast({
          title: "ngspice error",
          description: e,
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      });*/
    }
  }, [isSimLoaded, results]);

  const getColor = (): ColorType => {
    let contrast = 0;
    let r = 0,
      g = 0,
      b = 0;
    while (contrast < 4) {
      r = Math.random();
      g = Math.random();
      b = Math.random();

      //change the color versus background be careful of infinite loops

      contrast = calcContrast(calcLuminance(b, g, r), calcLuminance(23 / 255, 25 / 255, 35 / 255));
    }
    return { r: r, g: g, b: b } as ColorType;
  };

  //DisplayData logic
  const handleDisplayData = (result: ResultType) => {
    const newDD = makeDD(result);
    let tempDD = [] as DisplayDataType[];
    newDD.forEach((newData, i) => {
      let match = false;
      let visible = true;
      let color = getColor();
      if (displayData) {
        displayData.forEach((oldData) => {
          //account for new color type
          if (newData.name == oldData.name && oldData.color) {
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
  };

  const makeDD = (res: ResultType): DisplayDataType[] => {
    let dd = [] as DisplayDataType[];
    if (res.param.dataType == "complex") {
      res.param.variables.forEach((e, i) => {
        if (i > 0) {
          const color1 = getColor();
          dd.push({ name: e.name + " (mag)", index: 2 * i, visible: true, color: color1 });
          dd.push({ name: e.name + " (phase)", index: 2 * i + 1, visible: true, color: color1 });
        }
      });
    } else {
      res.param.variables.forEach((e, i) => {
        if (i > 0) {
          dd.push({ name: e.name, index: i, visible: true, color: getColor() });
        }
      });
    }

    console.log("makeDD->", dd);
    return dd;
  };

  const btRun = async () => {
    setIsSimRunning(true);
    setParser(getParser(netList));
    store.setItem("netList", netList);
    if (sim) {
      await sim.setNetList(netList);
      await sim.runSim();
    } else {
      //???????????????????????????????????????????????????????????????????????????????????????????????
      const worker = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
      sim = Comlink.wrap<typeof simulation>(worker);
      const callback = async () => {
        console.log("🚀", await sim.getResults());
        const res = await sim.getResults();
        //set the display data before results for coloring
        handleDisplayData(res);
        setResults(res);
        setIsSimRunning(false);
      };
      await sim.setOutputEvent(Comlink.proxy(callback));
      await sim.start();
      console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
      btRun();
      setIsSimLoaded(true);
    }
  };

  const change = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;

      //index 0 is time

      if (isSimLoaded && displayData) {
        const dd = displayData;

        dd.forEach((e) => {
          if (e.name == name) {
            e.visible = event.target.checked;
            console.log("change->", e, name);
          }
        });
        //console.log("change->", dd);

        setDisplayData([...dd]);
        const stringDD = JSON.stringify(dd);
        store.setItem("displayData", stringDD);
      }
    },
    [displayData, isSimLoaded]
  );

  const config = {
    useSystemColorMode: false,
    initialColorMode: "dark" as "dark" | "light" | undefined,
  };

  const customTheme = extendTheme({ config });

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleEditor = (value: string | undefined) => {
    value ? setNetList(value) : {};
  };

  const handleDeSelectButton = () => {
    if (displayData) {
      const disp = [...displayData];
      disp.forEach((e) => {
        e.visible = false;
      });
      setDisplayData(disp);
    }
  };

  const handleSelectAllButton = () => {
    if (displayData) {
      const disp = [...displayData];
      disp.forEach((e) => {
        e.visible = true;
      });
      setDisplayData(disp);
    }
  };

  const btReset = () => {
    setResults(undefined);
    setDisplayData(undefined);
    store.removeItem("displayData");

    //worker test
    /*const myWorker = new Worker(new URL("./worker.js", import.meta.url));
    myWorker.postMessage([10, 34]);
    myWorker.onmessage = function (e) {
      console.log("Message received from worker", e.data);
    };*/

    async function init() {
      // WebWorkers use `postMessage` and therefore work with Comlink.

      //alert(`Counter: ${await obj.counter}`);

      await sim.setNetList(netList);
      await sim.start();
      await sim.runSim();

      //alert(`Counter: ${await obj.counter}`);
    }
    init();
  };

  const btColor = () => {
    if (results && displayData) {
      const d = [...displayData];
      d.forEach((e) => {
        e.color = getColor();
      });
      setDisplayData(d);
      setResults({ ...results });
    }
  };

  return (
    <ChakraProvider theme={customTheme}>
      <div>
        <Box p={2}>
          <div style={{ display: "flex", width: "100%" }}>
            <EditorCustom
              height="30vh"
              width="100%"
              language="spice"
              value={netList}
              valueChanged={handleEditor}
              theme="vs-dark"
            />

            <div style={{ width: "30%", marginLeft: "5%" }}>
              <Stack direction="row" spacing={2} align="stretch" width="100%" marginBottom="0.5em">
                <Button colorScheme="blue" onClick={handleSelectAllButton}>
                  Select all
                </Button>
                <Button colorScheme="blue" onClick={handleDeSelectButton}>
                  De-select all
                </Button>
              </Stack>
              <DisplayBox displayData={displayData ? displayData : []} onChange={change} />
            </div>
          </div>
        </Box>
        <Box p={1} width="72.5%">
          <Flex>
            <Button
              colorScheme="blue"
              variant="solid"
              size="lg"
              m={1}
              onClick={btRun}
              isLoading={isSimRunning}
              loadingText="Running">
              Run 🚀
            </Button>
            <Spacer />
            <Button
              colorScheme="blue"
              variant="solid"
              size="lg"
              m={1}
              onClick={btColor}
              isDisabled={isSimRunning}>
              Colorize 🌈
            </Button>
            <Button
              colorScheme="blue"
              variant="solid"
              size="lg"
              m={1}
              onClick={btReset}
              isDisabled={isSimRunning}>
              Reset 🧼
            </Button>
          </Flex>
        </Box>

        <Box p={2}>
          <Divider />
        </Box>

        <Tabs variant="soft-rounded" colorScheme="teal">
          <TabList>
            <Tab>Plot 📈</Tab>
            <Tab>Info 🧙‍♂️</Tab>
            <Tab>CSV 🧾</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Plot results={results} parser={parser} displayData={displayData} />
            </TabPanel>

            <TabPanel>
              <Textarea
                readOnly={true}
                aria-label="info"
                bg="gray.900"
                fontSize="0.9em"
                rows={15}
                //value={results ? results.header : ""}
                //value={sim ? sim.getInfo() + "\n\n" + results?.header : ""}
              />
            </TabPanel>

            <TabPanel>
              <DownCSV results={results} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </ChakraProvider>
  );
}
