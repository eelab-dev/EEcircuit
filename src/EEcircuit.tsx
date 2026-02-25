/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { JSX, Suspense, useEffect, useState } from "react";
//import * as circuits from "./sim/circuits.ts";
import {
  NumberInputValueChangeDetails,
  PopoverOpenChangeDetails,
} from "@chakra-ui/react";

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
import {
  useColorMode,
  useColorModeValue,
  ColorModeButton,
} from "./components/ui/color-mode.tsx";
import { PyodideRunner } from "./python/pyodideRunner.ts";
import AiChat from "./ai/AiChat.tsx";

type EditorMode = "spice" | "python";

let sim: SimArray;
let pyRunner: PyodideRunner | null = null;
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

const pythonDefault = `from analogpy import (
    Testbench, resistor, capacitor, inductor,
    nmos, vsource, vpulse, Transient,
    generate_ngspice,
)

tb = Testbench("rlc_circuit")
tb.include("modelcard.CMOS90")

vdd_net = tb.net("vdd")
net_rc = tb.net("net_rc")
gate = tb.net("gate")
gnd = tb.gnd()

# Passive components between vdd and net_rc
tb.add_instance(resistor, "r", p=vdd_net, n=net_rc, r=100.0)
tb.add_instance(inductor, "l", p=vdd_net, n=net_rc, l=1)
# tb.add_instance(capacitor, "c", p=vdd_net, n=net_rc, c=0.01, rotation=180)
tb.add_instance(capacitor, "c", p=vdd_net, n=net_rc, c=0.01)

# NMOS transistor
tb.add_instance(nmos, "m1", d=net_rc, g=gate, s=gnd, b=gnd,
                model="N90", w=100e-6, l=0.09e-6,
                schematic_position={'relative_to': 'l', 'x_shift': 0.5, 'y_shift': -2},
)

# Power supply
tb.add_instance(vsource, "vdd", p=vdd_net, n=gnd, dc=1.8)

# Input pulse (using vpulse convenience device)
tb.add_instance(vpulse, "vin", p=gate, n=gnd,
                val0=0, val1=1.8, delay=0,
                rise=0.1, fall=0.1, width=15, period=30,
                schematic_position={'relative_to': 'm1', 'x_shift': -2, 'y_shift': -1},)

tb.add_analysis(Transient(stop=50, step=0.05))

tb.draw_wires('gate')
tb.draw_wires('vdd', only=[('r', 'p'), ('l', 'p')])
tb.draw_wires('vdd', only=[('l', 'p'), ('c', 'p')])
tb.draw_wires('net_rc')

#print(generate_ngspice(tb))
`;

export default function EEcircuit(): JSX.Element {
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

  // Python / editor mode state
  const [editorMode, setEditorMode] = React.useState<EditorMode>(
    () => (store.getItem("editorMode") as EditorMode) || "spice"
  );
  const [pythonCode, setPythonCode] = React.useState(
    () => store.getItem("pythonCode") || pythonDefault
  );
  const [generatedNgspice, setGeneratedNgspice] = React.useState("");
  const [generatedSpectre, setGeneratedSpectre] = React.useState("");
  const [schematicSvg, setSchematicSvg] = React.useState("");
  const [schematicZoom, setSchematicZoom] = React.useState(1.0);
  const [isPyLoading, setIsPyLoading] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = React.useCallback(() => {
    if (!isFullscreen) {
      // Scroll the tabs container to the top of the viewport
      tabsContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setIsFullscreen(f => !f);
  }, [isFullscreen]);

  const colorMode = useColorModeValue("light", "dark");

  useEffect(() => {
    const loadedMode = store.getItem("editorMode") as EditorMode | null;
    if (loadedMode === "python") {
      setEditorMode("python");
      const loadedPy = store.getItem("pythonCode");
      if (loadedPy) setPythonCode(loadedPy);
    } else {
      const loadedNetList = store.getItem("netList");
      setNetList(loadedNetList ? loadedNetList : circuitDefault);
    }

    const loadedDisplayDataString = store.getItem("displayData");
    if (loadedDisplayDataString) {
      const loadedDisplayData = JSON.parse(
        loadedDisplayDataString
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
    // Python mode: run Python code first to generate netlist
    if (editorMode === "python") {
      setIsSimRunning(true);
      store.setItem("pythonCode", pythonCode);

      // Initialize Pyodide if needed
      if (!pyRunner || !pyRunner.isReady) {
        setIsPyLoading(true);
        toaster.create({
          description: "Loading Python runtime (first time only)...",
          type: "info",
        });
        pyRunner = new PyodideRunner();
        try {
          await pyRunner.init();
        } catch (e) {
          toaster.create({
            description: "Failed to load Python runtime: " + (e instanceof Error ? e.message : String(e)),
            type: "error",
          });
          setIsPyLoading(false);
          setIsSimRunning(false);
          return;
        }
        setIsPyLoading(false);
      }

      // Run Python code
      const pyResult = await pyRunner.runPython(pythonCode);
      if (pyResult.error) {
        setInfo(prev => prev + "\n\n[Python Error]\n" + pyResult.error);
        toaster.create({
          description: "Python error: " + pyResult.error,
          type: "error",
        });
        setIsSimRunning(false);
        return;
      }

      if (!pyResult.ngspice) {
        toaster.create({
          description: "Python code did not produce an ngspice netlist. Make sure to call generate_ngspice() or print() the netlist.",
          type: "error",
        });
        setIsSimRunning(false);
        return;
      }

      setGeneratedNgspice(pyResult.ngspice);
      setGeneratedSpectre(pyResult.spectre);
      const svgData = pyResult.schematicSvg || "";
      console.log("schematicSvg length:", svgData.length, "first 100:", svgData.substring(0, 100));
      setSchematicSvg(svgData);

      // Use the generated netlist for simulation
      setNetList(pyResult.ngspice);
      setIsSimRunning(false);

      // Now run the simulation with the generated netlist
      await runSimulation(pyResult.ngspice);
      return;
    }

    // SPICE mode: run directly
    store.setItem("netList", netList);
    await runSimulation(netList);
  };

  const runSimulation = async (netlistToRun: string) => {
    if (sim && threadCount === threadCountNew) {
      setIsSimRunning(true);
      sim.setNetList(netlistToRun);
      try {
        const resultArray = await sim.runSim();
        const errors = await sim.getError();
        if (errors.length > 0) {
          setInfo(prev => prev + "\n\n[Simulation Error]\n" + errors.join("\n"));
          errors.forEach((e) => {
            toaster.create({
              description: e,
              type: "error",
            });
          });
        }
        if (resultArray.results.length === 0) {
          toaster.create({
            description: "Simulation returned no results. Check your netlist syntax.",
            type: "error",
          });
        } else {
          setResultArray(resultArray);
        }
        setInfo(initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n");
      } catch (e) {
        toaster.create({
          description: e instanceof Error ? e.message : String(e),
          type: "error",
        });
      }
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
      runSimulation(netlistToRun);
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
      if (!displayData) return;
      
      const newDisplayData = displayData.map(item => 
        item.name === name ? { ...item, visible: check } : item
      );

      setDisplayData(newDisplayData);
      store.setItem("displayData", JSON.stringify(newDisplayData));
    },
    [displayData]
  );

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value) {
      if (editorMode === "python") {
        setPythonCode(value);
      } else {
        setNetList(value);
      }
    }
  }, [editorMode]);

  const handleModeSwitch = React.useCallback(() => {
    const newMode = editorMode === "spice" ? "python" : "spice";
    setEditorMode(newMode);
    store.setItem("editorMode", newMode);
    // Clear generated netlists when switching mode
    setGeneratedNgspice("");
    setGeneratedSpectre("");
    setSchematicSvg("");
  }, [editorMode]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Header Row: Branding + Controls */}
      {!isFullscreen && (
        <Box p={1} width="100%" borderBottom="1px solid" borderColor="border.muted">
          <Flex align="center" gap={2}>
            {/* Branding */}
            <Flex align="center" flexShrink={0} mr={4}>
              <Image
                src="analogpy.png"
                alt="analogpy logo"
                height="2.5em"
                mr={3}
                borderRadius="4px"
              />
              <Flex direction="column" display={{ base: "none", md: "flex" }}>
                <Box
                  fontFamily="monospace"
                  fontSize="md"
                  fontWeight="bold"
                  bg="bg.muted"
                  px={2}
                  py={0.5}
                  borderRadius="md"
                  width="fit-content"
                >
                  pip install analogpy
                </Box>
                <Box fontSize="xs" fontWeight="medium" color="fg.muted" mt={0.5}>
                  Python-native circuit simulation
                </Box>
              </Flex>
            </Flex>

            {/* Controls */}
            <Button
              colorScheme={editorMode === "python" ? "green" : "blue"}
              variant="solid"
              size="md"
              onClick={btRun}
              loading={isSimRunning || isSimLoading || isPyLoading}
              loadingText={isPyLoading ? "Loading Python..." : isSimLoading ? "Loading..." : "Running..."}
            >
              Run 🚀
            </Button>

            <PopoverRoot
              open={open}
              onOpenChange={(e: PopoverOpenChangeDetails) => setOpen(e.open)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="md"
                  px={1}
                  disabled={isSimRunning}
                  title="Simulation Settings"
                >
                  ⚙️
                </Button>
              </PopoverTrigger>
              <PopoverArrow />
              <PopoverContent p={5}>
                <PopoverBody>
                  <PopoverTitle>Threads</PopoverTitle>
                  <Box>
                    <NumberInputRoot
                      max={20}
                      defaultValue={threadCount.toString()}
                      min={1}
                      onValueChange={handleThreadChange}
                    >
                      <NumberInputField />
                    </NumberInputRoot>
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </PopoverRoot>

            <ColorModeButton />

            <Button
              colorScheme={editorMode === "python" ? "green" : "gray"}
              variant={editorMode === "python" ? "solid" : "outline"}
              size="md"
              onClick={handleModeSwitch}
              disabled={isSimRunning}
            >
              {editorMode === "python" ? "Python 🐍" : "SPICE ⚡"}
            </Button>

            <Spacer />
            
            <Button
              colorScheme="blue"
              variant="ghost"
              size="md"
              onClick={btReset}
              disabled={isSimRunning}
              mr={20}
            >
              Clear 🗑️
            </Button>
          </Flex>
          <ProgressRoot value={progress} size="xs" mt={1}>
            <ProgressBar />
          </ProgressRoot>
        </Box>
      )}

      {/* Editor + Schematic panel — grows when tabs are minimized */}
      <Box
        border="solid 0px"
        p={2}
        flex="0 0 auto"
        overflow="hidden"
        display={isFullscreen ? "none" : undefined}
      >
        <Flex width="100%" height="40vh">
          {/* Left: text editor (60%) */}
          <Box width={{ base: "100%", md: "55%" }} minWidth={0} height="40vh">
            <Suspense fallback={<Skeleton height="40vh" width="100%" />}>
              <EditorCustom
                height="40vh"
                width="100%"
                language={editorMode === "python" ? "python" : "spice"}
                value={editorMode === "python" ? pythonCode : netList}
                valueChanged={handleEditor}
                theme={useColorModeValue("light", "dark")}
                key={`${windowSize.width}-${editorMode}`}
              />
            </Suspense>
          </Box>
          {/* Right: schematic panel (40%) — only on desktop */}
          {displayBreakpoint !== "base" && (
            <Box width="45%" pl={2} height="40vh" display="flex" flexDirection="column">
              {schematicSvg && !schematicSvg.startsWith("<!-- SVG error") ? (
                <>
                  <Flex gap={1} mb={1} align="center" flexShrink={0}>
                    <Button size="xs" onClick={() => setSchematicZoom(z => Math.min(z * 1.25, 5))}>+</Button>
                    <Button size="xs" onClick={() => setSchematicZoom(z => Math.max(z / 1.25, 0.2))}>-</Button>
                    <Button size="xs" variant="outline" onClick={() => setSchematicZoom(1.0)}>100%</Button>
                    <Box fontSize="xs" color="fg.muted">{Math.round(schematicZoom * 100)}%</Box>
                  </Flex>
                  {/* Fixed-size scrollable container — zoom changes SVG internal size only */}
                  <div
                    style={{
                      flex: 1,
                      overflow: "auto",
                      background: "white",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      cursor: "grab",
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${schematicZoom * 100}%`,
                        minWidth: "100%",
                        lineHeight: 0,
                      }}
                      dangerouslySetInnerHTML={{ __html: schematicSvg }}
                    />
                  </div>
                </>
              ) : (
                <Box
                  height="100%"
                  border="1px dashed"
                  borderColor="border.muted"
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="fg.muted"
                  fontSize="sm"
                  p={4}
                  textAlign="center"
                >
                  {editorMode === "python"
                    ? "Schematic appears here after running Python code"
                    : "Switch to Python mode to see schematic"}
                </Box>
              )}
            </Box>
          )}
        </Flex>
      </Box>

      <div
        ref={tabsContainerRef}
        style={{
          background: isFullscreen ? "var(--chakra-colors-bg)" : undefined,
          padding: isFullscreen ? "8px" : undefined,
          height: isFullscreen ? "calc(100vh - 8px)" : undefined,
          maxHeight: isFullscreen ? "calc(100vh - 8px)" : undefined,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
      <Tabs.Root
        defaultValue="plot"
        colorScheme="teal"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Tabs.List>
          <Tabs.Trigger
            value="plot"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            Plot 📈
          </Tabs.Trigger>
          <Tabs.Trigger
            value="info"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            Info 👩‍💻
          </Tabs.Trigger>
          <Tabs.Trigger
            value="csv"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            CSV 📄
          </Tabs.Trigger>
          {editorMode === "python" && (
            <>
              <Tabs.Trigger
                value="ngspice"
                marginRight="0.5em"
                paddingLeft="2em"
                paddingRight="2em"
              >
                ngspice
              </Tabs.Trigger>
              <Tabs.Trigger
                value="spectre"
                marginRight="0.5em"
                paddingLeft="2em"
                paddingRight="2em"
              >
                Spectre
              </Tabs.Trigger>
            </>
          )}
          <Tabs.Trigger
            value="ai"
            marginRight="0.5em"
            paddingLeft="2em"
            paddingRight="2em"
          >
            AI 🤖
          </Tabs.Trigger>
          <Spacer />
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            m={1}
            mr={20}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "Exit ⛶" : "⛶"}
          </Button>
        </Tabs.List>

        <Tabs.Content value="plot" style={{ flex: 1, overflow: "hidden", minHeight: "200px" }}>
          <Suspense fallback={<Skeleton height="400px" />}>
            <PlotArray
              resultArray={resultArray}
              displayData={displayData}
              theme={useColorModeValue("light", "dark")}
              checkCallBack={change}
              selectAllCallback={handleSelectAllButton}
              selectNoneCallback={handleDeSelectButton}
              colorizeCallback={btColor}
              height={isFullscreen ? "70vh" : "40vh"}
            />
          </Suspense>
        </Tabs.Content>

        <Tabs.Content value="info" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <Textarea
            readOnly={true}
            aria-label="info"
            bg="bg.muted"
            fontSize="0.9em"
            rows={isFullscreen ? 40 : 15}
            value={info}
          />
        </Tabs.Content>

        <Tabs.Content value="csv" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <DownCSV resultArray={resultArray} />
        </Tabs.Content>

        {editorMode === "python" && (
          <>
            <Tabs.Content value="ngspice" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              <Textarea
                readOnly={true}
                aria-label="ngspice netlist"
                bg="bg.muted"
                fontSize="0.9em"
                fontFamily="monospace"
                rows={isFullscreen ? 40 : 20}
                value={generatedNgspice || "(Run Python code to generate ngspice netlist)"}
              />
            </Tabs.Content>

            <Tabs.Content value="spectre" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              <Textarea
                readOnly={true}
                aria-label="spectre netlist"
                bg="bg.muted"
                fontSize="0.9em"
                fontFamily="monospace"
                rows={isFullscreen ? 40 : 20}
                value={generatedSpectre || "(Run Python code to generate Spectre netlist)"}
              />
            </Tabs.Content>
          </>
        )}

        <Tabs.Content
          value="ai"
          style={{ flex: 1, overflow: "auto", minHeight: 0 }}
        >
          <AiChat
            netlist={netList}
            pythonCode={pythonCode}
            editorMode={editorMode}
            resultArray={resultArray}
            displayData={displayData}
            isFullscreen={isFullscreen}
          />
        </Tabs.Content>
      </Tabs.Root>
      </div>
      <Toaster />
    </div>
  );
}
