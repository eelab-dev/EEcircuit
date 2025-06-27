"use client";
import React from "react";
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

import { Toaster } from "./components/ui/toaster.tsx";

//import { ProgressBar, ProgressRoot } from "./components/ui/progress.tsx";

//import { getColor } from "./colors.ts";
//import { isComplex, ResultArrayType, SimArray } from "./sim/simulationArray.ts";
//import { DisplayDataType, makeDD } from "./displayData.ts";

import Schematic from "./schematic/schematic.tsx";
import SimulationEditor from "./Simulate/simulate.tsx";
import { TabsValueChangeDetails } from "node_modules/@chakra-ui/react/dist/types/components/tabs/tabs";
import Logo from "./logo.tsx";
import Plot from "./plot/plot.tsx";
import { ResultType } from "eecircuit-engine";

type TabsValue = "schematic" | "simulate" | "plot";

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
  const [tabValue, setTabValue] = React.useState<TabsValue>("schematic");
  const [shouldFitToScreen, setShouldFitToScreen] = React.useState(false);
  const [hasResizedSinceSchematicView, setHasResizedSinceSchematicView] =
    React.useState(false);
  const [hasViewedSchematic, setHasViewedSchematic] = React.useState(false);
  //const [sweep, setSweep] = React.useState(false);
  //const [progress, setProgress] = React.useState(0);
  //const [threadCountNew, setThreadCountNew] = React.useState(1);

  //const colorMode = useColorModeValue("light", "dark");

  const [results, setResults] = React.useState<ResultType[]>([]);

  // Tab enablement states
  const [isSimulateTabEnabled, setIsSimulateTabEnabled] = React.useState(false);
  const [isPlotTabEnabled, setIsPlotTabEnabled] = React.useState(false);

  // Track window resize events
  React.useEffect(() => {
    const handleResize = () => {
      setHasResizedSinceSchematicView(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle initial schematic view (when component mounts and schematic is the default tab)
  React.useEffect(() => {
    if (tabValue === "schematic" && !hasViewedSchematic) {
      // Delay the fit command to ensure canvas is ready
      const timer = setTimeout(() => {
        setShouldFitToScreen(true);
        setHasViewedSchematic(true);
      }, 200); // Longer delay for initial load
      return () => clearTimeout(timer);
    }
  }, [tabValue, hasViewedSchematic]);

  // Reset shouldFitToScreen flag after it's been processed
  React.useEffect(() => {
    if (shouldFitToScreen) {
      const timer = setTimeout(() => {
        setShouldFitToScreen(false);
      }, 100); // Small delay to ensure the command is processed
      return () => clearTimeout(timer);
    }
  }, [shouldFitToScreen]);

  // Callback when canvas is resized
  const handleCanvasResized = React.useCallback(() => {
    setHasResizedSinceSchematicView(false);
  }, []);

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

    const netlistWithPreamble = netListPreamble + netlist;
    setNetList(netlistWithPreamble);
    setIsSimulateTabEnabled(true); // Enable simulate tab when netlist is exported
    setTabValue("simulate");
  }, []);

  const handleTabValueChange = React.useCallback(
    (details: TabsValueChangeDetails) => {
      const newTabValue = details.value as TabsValue;

      // Prevent switching to disabled tabs
      if (newTabValue === "simulate" && !isSimulateTabEnabled) {
        return;
      }
      if (newTabValue === "plot" && !isPlotTabEnabled) {
        return;
      }

      setTabValue(newTabValue);

      // Handle schematic tab activation
      if (newTabValue === "schematic") {
        // Fit to screen if this is the first time viewing or if window was resized
        if (!hasViewedSchematic || hasResizedSinceSchematicView) {
          // Small delay to ensure tab content is visible and canvas is ready
          setTimeout(() => {
            setShouldFitToScreen(true);
            setHasViewedSchematic(true);
            // Note: hasResizedSinceSchematicView will be reset by the onCanvasResized callback
            // when the canvas is actually resized, not immediately here
          }, 100);
        }
      } else {
        // Reset fit to screen flag when leaving schematic tab
        setShouldFitToScreen(false);
      }
    },
    [
      hasViewedSchematic,
      hasResizedSinceSchematicView,
      isSimulateTabEnabled,
      isPlotTabEnabled,
    ]
  );

  const handleNewResults = React.useCallback((newResults: ResultType[]) => {
    // Double-check that we have valid results before enabling plot tab
    const hasValidResults =
      newResults &&
      newResults.length > 0 &&
      newResults[0].data &&
      newResults[0].data.length > 0 &&
      newResults[0].variableNames &&
      newResults[0].variableNames.length > 0;

    // Additional check for actual data points
    let hasDataPoints = false;
    if (hasValidResults) {
      hasDataPoints = newResults[0].data.some(
        (dataSet) => dataSet.values && dataSet.values.length > 0
      );
    }

    if (hasValidResults && hasDataPoints) {
      setResults(newResults);
      setIsPlotTabEnabled(true); // Enable plot tab when valid results are obtained
      setTabValue("plot");
    } else {
      // This should not happen if simulate.tsx is working correctly, but just in case
      console.warn(
        "handleNewResults called with invalid results, not enabling plot tab"
      );
    }
  }, []);

  return (
    <Box
      border="solid 0px"
      p={2}
      height={"100vh"}
      display={"flex"}
      flexDirection={"column"}
      overflow="hidden"
    >
      <Flex direction="row" alignItems={"self-end"} gapX={2} flexShrink={0}>
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
        minHeight={0}
      >
        <Tabs.List flexShrink={0}>
          <Tabs.Trigger value="schematic" marginRight="0.5em">
            Schematic
          </Tabs.Trigger>
          <Tabs.Trigger
            value="simulate"
            marginRight="0.5em"
            disabled={!isSimulateTabEnabled}
            style={{
              opacity: isSimulateTabEnabled ? 1 : 0.5,
              cursor: isSimulateTabEnabled ? "pointer" : "not-allowed",
            }}
          >
            Simulate
          </Tabs.Trigger>
          <Tabs.Trigger
            value="plot"
            marginRight="0.5em"
            disabled={!isPlotTabEnabled}
            style={{
              opacity: isPlotTabEnabled ? 1 : 0.5,
              cursor: isPlotTabEnabled ? "pointer" : "not-allowed",
            }}
          >
            Plot
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="schematic" flex={1} minHeight={0}>
          <Schematic
            onNetlistExported={exportedNetlist}
            shouldFitToScreen={shouldFitToScreen}
            onCanvasResized={handleCanvasResized}
          />
        </Tabs.Content>

        <Tabs.Content value="simulate" flex={1} minHeight={0}>
          <SimulationEditor
            netList={netList}
            onResultsObtained={handleNewResults}
          />
        </Tabs.Content>

        <Tabs.Content value="plot" flex={1} minHeight={0}>
          <Plot results={results} />
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
      <Toaster />
    </Box>
  );
};

export default EEcircuit;
