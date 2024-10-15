import React, { JSX, Suspense, useEffect, useState } from "react";
import * as circuits from "./sim/circuits.ts";

import FocusLock from "react-focus-lock";

const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));

import PlotArray from "./plotArray.tsx";
import DisplayBox from "./displayBox.tsx";
import DownCSV from "./downCSV.tsx";

import {
  Box,
  Button,
  Divider,
  Flex,
  Image,
  Progress,
  Spacer,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  Popover,
  PopoverArrow,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/react";

import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";

import { getColor } from "./colors.ts";
import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray.ts";
import { DisplayDataType, makeDD } from "./displayData.ts";

let sim: SimArray;
const store = globalThis.localStorage;
let initialSimInfo = "";
let threadCount = 1;

export default function EEcircuit(): JSX.Element {
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
  const [threadCountNew, setThreadCountNew] = React.useState(1);

  //const toast = createStandaloneToast();
  const toast = useToast();

  useEffect(() => {
    const loadedNetList = store.getItem("netList");
    setNetList(loadedNetList ? loadedNetList : circuits.bsimTrans);

    const loadedDisplayDataString = store.getItem("displayData");
    if (loadedDisplayDataString) {
      const loadedDisplayData = JSON.parse(
        loadedDisplayDataString,
      ) as DisplayDataType[];
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
    if (resultArray && resultArray.results.length > 0) {
      const newDD = makeDD(resultArray.results[0]);
      const tempDD = [] as DisplayDataType[];
      newDD.forEach((newData, i) => {
        let match = false;
        let visible = true;
        let color = getColor();

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
      sim = new SimArray();
      threadCount = threadCountNew;
      await sim.init(threadCount);
      initialSimInfo = await sim.getInitInfo();
      sim.progressCallback = simProgressCallback;
      setIsSimLoaded(true);
      setProgress(0);
      //initialSimInfo = await sim.getInfo(); //not yet working???????
      btRun();
    }
  };

  const simProgressCallback = React.useCallback((n: number) => {
    setProgress(n);
    console.log(n);
  }, []);

  /*const simProgressCallback = (n: number) => {
    setProgress(n);
    console.log(n);
  };*/

  const change = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = (event.target as HTMLInputElement).name;

      //index 0 is time

      if (isSimLoaded && displayData) {
        const dd = displayData;

        dd.forEach((e) => {
          if (e.name === name) {
            e.visible = (event.target as HTMLInputElement).checked;
            console.log("change->", e, name);
          }
        });
        //console.log("change->", dd);

        setDisplayData([...dd]);
        const stringDD = JSON.stringify(dd);
        store.setItem("displayData", stringDD);
      }
    },
    [displayData, isSimLoaded],
  );

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

  const LineSelectBox = (): JSX.Element => {
    return (
      <Box w={{ base: "100%", md: "30%" }} marginLeft="5%">
        <Stack
          direction="row"
          spacing={2}
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
        <DisplayBox
          displayData={displayData ? displayData : []}
          onChange={change}
        />
      </Box>
    );
  };

  const { onOpen, onClose, isOpen } = useDisclosure();
  const handleThreadChange = (valueString: string, valueNumber: number) => {
    setThreadCountNew(valueNumber);
  };

  const displayBreakpoint = useBreakpointValue({ base: "base", md: "md" });
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });

  useEffect(() => {
    // Simulate loading of other components
    setTimeout(() => {
      setComponentsLoaded(true);
    }, 10); // Adjust the timeout as needed
  }, []);

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
        <Flex width="100%">
          {componentsLoaded && (
            <Suspense fallback={<div>Text Editor Loading...</div>}>
              <EditorCustom
                height="30vh"
                width="100%"
                language="spice"
                value={netList}
                valueChanged={handleEditor}
                theme="vs-dark"
                key={windowSize.width}
              />
            </Suspense>
          )}
          {displayBreakpoint == "base" ? <></> : LineSelectBox()}
        </Flex>
      </Box>
      <Box p={1} width={{ base: "100%", md: "73%" }}>
        <Flex>
          <Button
            colorScheme="blue"
            variant="solid"
            size="lg"
            m={1}
            onClick={btRun}
            isLoading={isSimRunning}
            loadingText={isSimLoaded ? "Running 🏃" : "Loading 🚚"}
          >
            Run{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F680.min.svg"
              height="80%"
            />
          </Button>

          <Spacer />
          <Popover
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <Button
                colorScheme="blue"
                variant="solid"
                size="lg"
                m={1}
                isDisabled={isSimRunning}
              >
                {displayBreakpoint === "base" ? "" : "Settings"}{" "}
                <Image
                  src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/2699.min.svg"
                  height="80%"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent p={5}>
              <FocusLock returnFocus persistentFocus={false}>
                <PopoverArrow />
                <PopoverCloseButton />
                <Box>
                  Threads
                  <NumberInput
                    maxW={20}
                    value={threadCountNew}
                    min={1}
                    onChange={handleThreadChange}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </Box>
              </FocusLock>
            </PopoverContent>
          </Popover>
          <Button
            colorScheme="blue"
            variant="solid"
            size="lg"
            m={1}
            onClick={btColor}
            isDisabled={isSimRunning}
          >
            {displayBreakpoint === "base" ? "" : "Colorize"}{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F308.min.svg"
              height="80%"
            />
          </Button>
          <Button
            colorScheme="blue"
            variant="solid"
            size="lg"
            m={1}
            onClick={btReset}
            isDisabled={isSimRunning}
          >
            {displayBreakpoint === "base" ? "" : "Reset"}{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F5D1.min.svg"
              height="80%"
            />
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
          <Tab marginRight="0.5em" paddingLeft="2em" paddingRight="2em">
            Plot
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F4C8.min.svg"
              maxHeight="80%"
            />
          </Tab>
          <Tab marginRight="0.5em" paddingLeft="2em" paddingRight="2em">
            Info
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F469-200D-1F4BB.min.svg"
              height="80%"
            />
          </Tab>
          <Tab marginRight="0.5em" paddingLeft="2em" paddingRight="2em">
            CSV{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F4D1.min.svg"
              height="80%"
            />
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <PlotArray resultArray={resultArray} displayData={displayData} />
            {displayBreakpoint !== "base" ? <></> : (
              <>
                <Spacer p={2} /> {LineSelectBox()}
              </>
            )}
          </TabPanel>

          <TabPanel>
            <Textarea
              readOnly={true}
              aria-label="info"
              bg="gray.900"
              fontSize="0.9em"
              rows={15}
              value={info}
            />
          </TabPanel>

          <TabPanel>
            <DownCSV resultArray={resultArray} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
