import React, { useEffect } from "react";
import * as circuits from "./sim/circuits";

import EditorCustom from "./editor/editorCustom";

import PlotArray from "./plotArray";
import DisplayBox from "./displayBox";
import DownCSV from "./downCSV";

import {
  Button,
  Box,
  ChakraProvider,
  createStandaloneToast,
  Divider,
  Flex,
  Progress,
  Spacer,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  useToast,
  extendTheme,
} from "@chakra-ui/react";
import { getColor } from "./colors";
import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray";
import { DisplayDataType, makeDD } from "./displayData";

let sim: SimArray;
const store = window.localStorage;
let initialSimInfo = "";

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  const [isSimRunning, setIsSimRunning] = React.useState(false);
  const [resultArray, setResultArray] = React.useState<ResultArrayType>();
  const [info, setInfo] = React.useState("");
  const [netList, setNetList] = React.useState(circuits.bsimTrans);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabIndex, setTabIndex] = React.useState(0);
  const [sweep, setSweep] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

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
    if (resultArray && resultArray.results.length > 1) {
      setSweep(true);
    }
  }, [resultArray]);

  useEffect(() => {
    const displayErrors = async () => {
      const errors = await sim.getError();
      errors.forEach((e) => {
        toast({
          title: "ngspice error",
          description: e,
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      });
    };

    if (isSimLoaded) {
      displayErrors();
    }
  }, [isSimLoaded, resultArray]);

  useEffect(() => {
    //DisplayData logic
    if (resultArray) {
      const newDD = makeDD(resultArray.results[0]);
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
    }
  }, [resultArray]);

  /*const simOutputCallback = React.useCallback(async () => {
    //none of the React.State are accessible in the callback
    const res = await sim.getResults();
    console.log("🚀", res);
    setResults(res);
    setInfo(initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n" + res.header);
    setIsSimRunning(false);
  }, []);*/

  const btRun = async () => {
    if (sim) {
      setIsSimRunning(true);
      //setParser(getParser(netList));
      store.setItem("netList", netList);
      sim.setNetList(netList);
      const resultArray = await sim.runSim();
      setResultArray(resultArray);
      setInfo(initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n"); ///??????????? res.header
      setIsSimRunning(false);
    } else {
      //spawn worker thread
      sim = new SimArray(); //await????
      sim.progressCallback = simProgressCallback;
      setIsSimLoaded(true);
      setProgress(0);
      //initialSimInfo = await sim.getInfo(); //not yet working???????
      btRun();
    }
  };

  const simProgressCallback = (n: number) => {
    setProgress(n);
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

  const handleEditor = React.useCallback((value: string | undefined) => {
    value ? setNetList(value) : {};
  }, []);

  const handleDeSelectButton = React.useCallback(() => {
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

  const btUpdateGraph = React.useCallback(() => {
    const results = sim.getResults();
    setResultArray(results);
  }, []);

  const btReset = React.useCallback(() => {
    setResultArray(undefined);
    setDisplayData(undefined);
    store.removeItem("displayData");
  }, []);

  const btColor = React.useCallback(() => {
    if (resultArray && displayData) {
      const d = [...displayData];
      if (!isComplex(resultArray)) {
        d.forEach((e) => {
          e.color = getColor();
        });
      } else {
        for (let i = 0; i < d.length - 1; i = i + 2) {
          const c = getColor();
          d[i].color = c;
          d[i + 1].color = c;
        }
      }

      setDisplayData(d);
      //setResultArray({results:[...results], sweep:[...resultArray.sweep]});
    }
  }, [displayData]);

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
              loadingText={isSimLoaded ? "Running 🏃" : "Loading 🚚"}>
              Run 🚀
            </Button>
            {isSimRunning ? (
              <Button colorScheme="blue" variant="solid" size="lg" m={1} onClick={btUpdateGraph}>
                Update Graph
              </Button>
            ) : (
              <></>
            )}

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

        <Box p={1}>
          <Progress colorScheme={"green"} value={progress} />
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
              <PlotArray resultArray={resultArray} displayData={displayData} />
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
                value={info}
              />
            </TabPanel>

            <TabPanel>
              <DownCSV resultArray={resultArray} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </ChakraProvider>
  );
}
