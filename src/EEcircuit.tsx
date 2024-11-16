import React, { JSX, Suspense, useEffect, useState } from "react";
//import * as circuits from "./sim/circuits.ts";
import {
  NumberInputValueChangeDetails,
  PopoverOpenChangeDetails,
} from "@chakra-ui/react";

import FocusLock from "react-focus-lock";

const EditorCustom = React.lazy(() => import("./editor/editorCustom.tsx"));
const PlotArray = React.lazy(() => import("./plotArray.tsx"));
const DisplayBox = React.lazy(() => import("./displayBox.tsx"));

//import PlotArray from "./plotArray.tsx";
//import DisplayBox from "./displayBox.tsx";
import DownCSV from "./downCSV.tsx";

import {
  Box,
  Flex,
  Image,
  Separator,
  Spacer,
  Stack,
  Tabs,
  Textarea,
  useBreakpointValue,
} from "@chakra-ui/react";

import {
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "./components/ui/popover.tsx";

import {
  NumberInputField,
  NumberInputLabel,
  NumberInputRoot,
} from "./components/ui/number-input.tsx";

/*import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";  */

import { Toaster, toaster } from "./components/ui/toaster.tsx";
import { Button } from "./components/ui/button.tsx";
import { Skeleton } from "./components/ui/skeleton.tsx";
import { ProgressBar, ProgressRoot } from "./components/ui/progress.tsx";

import { getColor } from "./colors.ts";
import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray.ts";
import { DisplayDataType, makeDD } from "./displayData.ts";

let sim: SimArray;
const store = globalThis.localStorage;
let initialSimInfo = "";
let threadCount = 1;

const circuitDefault = `Basic RLC circuit 
.include modelcard.CMOS90

r vdd 2 100.0
l vdd 2 1
c vdd 2 0.01
m1 2 1 0 0 N90 W=100.0u L=0.09u
vdd vdd 0 1.8

vin 1 0 0 pulse (0 1.8 0 0.1 0.1 15 30)
.tran 0.1 50

.end`;

export default function EEcircuit(): JSX.Element {
  // Create the count state.

  const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  const [isSimLoading, setIsSimLoading] = React.useState(false);
  const [isSimRunning, setIsSimRunning] = React.useState(false);
  const [resultArray, setResultArray] = React.useState<ResultArrayType>();
  const [info, setInfo] = React.useState("");
  const [netList, setNetList] = React.useState(circuitDefault);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabIndex, setTabIndex] = React.useState(0);
  const [sweep, setSweep] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [threadCountNew, setThreadCountNew] = React.useState(1);

  //const toast = createStandaloneToast();

  useEffect(() => {
    const loadedNetList = store.getItem("netList");
    setNetList(loadedNetList ? loadedNetList : circuitDefault);

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
          <DisplayBox
            displayData={displayData ? displayData : []}
            checkCallBack={change}
          />
        </Suspense>
      </Box>
    );
  };

  //const { onOpen, onClose } = useDisclosure();
  const [open, setOpen] = useState(false);
  const handleThreadChange = (e: NumberInputValueChangeDetails) => {
    // const valueNumber = parseInt(e.value);
    setThreadCountNew(e.valueAsNumber);
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
          <Suspense fallback={<Skeleton height="30vh" width="100%" />}>
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
            loading={isSimRunning || isSimLoading}
            loadingText={isSimLoading ? "Loading 🚚" : "Running 🏃"}
          >
            Run{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F680.min.svg"
              height="80%"
            />
          </Button>

          <Spacer />
          {
            <PopoverRoot
              open={open}
              onOpenChange={(e: PopoverOpenChangeDetails) => setOpen(e.open)}
            >
              <PopoverTrigger asChild>
                <Button
                  colorScheme="blue"
                  variant="solid"
                  size="lg"
                  m={1}
                  disabled={isSimRunning}
                >
                  {displayBreakpoint === "base" ? "" : "Settings"}{" "}
                  <Image
                    src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/2699.min.svg"
                    height="80%"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverArrow />
              <PopoverContent p={5}>
                <PopoverBody>
                  <PopoverTitle>Threads</PopoverTitle>
                  <FocusLock returnFocus persistentFocus={false}>
                    <Box>
                      {
                        <NumberInputRoot
                          max={20}
                          defaultValue={threadCount.toString()}
                          min={1}
                          onValueChange={handleThreadChange}
                        >
                          <NumberInputField />
                        </NumberInputRoot>
                      }
                    </Box>
                  </FocusLock>
                </PopoverBody>
              </PopoverContent>
            </PopoverRoot>
          }
          <Button
            colorScheme="blue"
            variant="solid"
            size="lg"
            m={1}
            onClick={btColor}
            disabled={isSimRunning}
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
            disabled={isSimRunning}
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
        <ProgressRoot value={progress}>
          <ProgressBar />
        </ProgressRoot>
      </Box>

      <Box p={2}>
        <Separator />
      </Box>

      <Tabs.Root defaultValue="plot" colorScheme="teal">
        <Tabs.List>
          <Tabs.Trigger
            value="plot"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            Plot
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F4C8.min.svg"
              maxHeight="80%"
            />
          </Tabs.Trigger>
          <Tabs.Trigger
            value="info"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            Info
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F469-200D-1F4BB.min.svg"
              height="80%"
            />
          </Tabs.Trigger>
          <Tabs.Trigger
            value="csv"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            CSV{" "}
            <Image
              src="https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0/color/svg/1F4D1.min.svg"
              height="80%"
            />
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="plot">
          <Suspense fallback={<Skeleton height="400px" />}>
            <PlotArray resultArray={resultArray} displayData={displayData} />
          </Suspense>
          {displayBreakpoint !== "base" ? <></> : (
            <>
              <Spacer p={2} />
              <Suspense fallback={<Skeleton height="100px" />}>
                {LineSelectBox()}
              </Suspense>
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="info">
          <Textarea
            readOnly={true}
            aria-label="info"
            bg="gray.900"
            fontSize="0.9em"
            rows={15}
            value={info}
          />
        </Tabs.Content>

        <Tabs.Content value="csv">
          <DownCSV resultArray={resultArray} />
        </Tabs.Content>
      </Tabs.Root>
      <Toaster />
    </div>
  );
}
