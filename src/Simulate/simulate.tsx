import {
  Button,
  Flex,
  Group,
  RadioCard,
  RadioCardValueChangeDetails,
} from "@chakra-ui/react";
import React, { Suspense, useEffect, useState } from "react";
import EditorCustom from "../editor/editorCustom";
import { useColorModeValue } from "../components/ui/color-mode";
import { Skeleton } from "@chakra-ui/react";
import DcConfig from "./simConfigs/dc";
import AcConfig from "./simConfigs/ac";
import TransConfig from "./simConfigs/trans";
import { ResultType } from "eecircuit-engine";
import { toaster } from "../components/ui/toaster";
import { SimulationType, ToBePlotted } from "../types/commonTypes";

type SimulationEditorProps = {
  netList: string;
  onResultsObtained: (results: ResultType[]) => void;
  selectedSimType: string;
  simulationConfig?: SimulationType;
  onSimulationConfigChange: (simType: string, config?: SimulationType) => void;
  onSwitchToSchematic?: () => void;
  toBePlotted?: ToBePlotted[];
};

const SimulationEditor: React.FC<SimulationEditorProps> = ({
  netList = "",
  onResultsObtained,
  selectedSimType,
  simulationConfig,
  onSimulationConfigChange,
  onSwitchToSchematic,
  toBePlotted = [],
}) => {
  const simType = ["None", "DC", "AC", "Trans"];

  const [simConfig, setSimConfig] = useState("");
  const [netListToSim, setNetListToSim] = useState(netList);

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setNetListToSim(value);
    }
  }, []);

  const saveCommandConfig = (toBePlotted: ToBePlotted[]) => {
    if (toBePlotted.length === 0) {
      return "";
    }

    const saveCommands = toBePlotted
      .map((item) => {
        if (item.type === "voltage") {
          return `v(${item.name})`;
        } else if (item.type === "current") {
          return `i(${item.name})`;
        }
        return "";
      })
      .filter((cmd) => cmd !== "");

    return `.save ${saveCommands.join(" ")}`;
  };

  useEffect(() => {
    if (selectedSimType === "None") {
      setSimConfig("");
      setNetListToSim(netList);
      return;
    } else {
      const saveCommand = saveCommandConfig(toBePlotted);
      const newNetList =
        netList + "\n\n" + simConfig + "\n\n" + saveCommand + "\n\n" + ".end";
      setNetListToSim(newNetList);
    }
  }, [netList, simConfig, selectedSimType, toBePlotted]);

  const handleConfigChange = React.useCallback((config: string) => {
    setSimConfig(config);
  }, []);

  // Handler for receiving the full configuration object directly from config components
  const handleFullConfigChange = React.useCallback(
    (config: SimulationType) => {
      onSimulationConfigChange(selectedSimType, config);
    },
    [selectedSimType, onSimulationConfigChange]
  );

  const handleSimRun = async () => {
    const { Simulation } = await import("eecircuit-engine");

    const sim = new Simulation();
    await sim.start();

    sim.setNetList(netListToSim);

    const result = await sim.runSim();

    console.log(sim.getInfo());
    console.log("Simulation Result:", result);

    if (result) {
      // Check if the result has valid data and variables
      const hasData = result.data && result.data.length > 0;
      const hasVariables =
        result.variableNames && result.variableNames.length > 0;

      // Additional check for actual data points in the result
      let hasDataPoints = false;
      if (hasData) {
        hasDataPoints = result.data.some(
          (dataSet) => dataSet.values && dataSet.values.length > 0
        );
      }

      if (!hasData || !hasVariables || !hasDataPoints) {
        // Show error toast for empty results
        toaster.create({
          title: "Simulation Error",
          description:
            "Simulation run but no results were generated. Check your netlist and simulation configuration.",
          type: "error",
          duration: 5000,
        });
        console.error("Simulation completed but returned empty results.");
        return; // Don't call onResultsObtained, preventing tab switch
      }

      // Valid results, proceed normally
      onResultsObtained([result]);
    } else {
      // Show error toast for failed simulation
      toaster.create({
        title: "Simulation Error",
        description: "Simulation failed to run. Check your netlist for errors.",
        type: "error",
        duration: 5000,
      });
      console.error("Simulation failed or returned no results.");
    }
  };

  return (
    <Flex
      width="100%"
      flexDirection={"row"}
      height="100%"
      overflow="hidden"
      position="relative"
      css={{
        "& *": {
          scrollbarWidth: "thin",
        },
        "&, & *": {
          overscrollBehavior: "contain",
        },
      }}
    >
      {/* Editor on the left */}
      <Flex flex="1" flexDirection="column" height="100%" overflow="hidden">
        {/* To Be Plotted button */}
        <Flex
          padding="2"
          borderBottom="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          justifyContent="flex-start"
          alignItems="center"
          gap="2"
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSwitchToSchematic?.();
            }}
          >
            To Be Plotted
          </Button>
          {/* Display current selected items */}
          {toBePlotted.length > 0 && (
            <span style={{ fontSize: "0.8rem", color: "gray" }}>
              ({toBePlotted.length} selected)
            </span>
          )}
          {/* Show detailed list of selected items */}
          {toBePlotted.length > 0 && (
            <div
              style={{ fontSize: "0.75rem", color: "gray", marginLeft: "10px" }}
            >
              {toBePlotted.map((item, index) => (
                <span key={index}>
                  {item.type}({item.name})
                  {index < toBePlotted.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
        </Flex>

        <Suspense fallback={<Skeleton height="100%" width="100%" />}>
          <EditorCustom
            height="100%"
            width="100%"
            language="spice"
            value={netListToSim}
            valueChanged={handleEditor}
            theme={useColorModeValue("light", "dark")}
          />
        </Suspense>
      </Flex>

      {/* Simulation options on the right */}
      <Flex
        flexDirection="column"
        minWidth="300px"
        maxWidth="400px"
        height="100%"
        overflow="hidden"
        borderLeft="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.600")}
        position="relative"
      >
        {/* Scrollable config area */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: "80px",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollbarColor: useColorModeValue(
              "rgb(203, 213, 225) transparent",
              "rgb(75, 85, 99) transparent"
            ),
          }}
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          <Flex flexDirection="column" gap={4}>
            <RadioCard.Root
              defaultValue={simType[0]}
              value={selectedSimType}
              gap="4"
              onValueChange={(value: RadioCardValueChangeDetails) => {
                if (value.value) {
                  // Call parent handler to update simulation type
                  onSimulationConfigChange(value.value, undefined);
                  // Reset sim config when changing types
                  setSimConfig("");
                }
              }}
            >
              <RadioCard.Label>Simulation type</RadioCard.Label>
              <Group
                attached
                display="grid"
                gridTemplateColumns="repeat(2, 1fr)"
                gap="0"
              >
                {simType.map((type) => (
                  <RadioCard.Item key={type} value={type} width="full">
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl>
                      <RadioCard.ItemIndicator />
                      <RadioCard.ItemContent>
                        <RadioCard.ItemText>{type}</RadioCard.ItemText>
                      </RadioCard.ItemContent>
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </Group>
            </RadioCard.Root>
            {(() => {
              switch (selectedSimType) {
                case "None":
                  return (
                    <>
                      <p>No addition to the netlist</p>
                    </>
                  );
                case "DC":
                  return (
                    <DcConfig
                      onConfigChange={handleConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        simulationConfig?.type === "DC"
                          ? simulationConfig
                          : undefined
                      }
                    />
                  );
                case "AC":
                  return (
                    <AcConfig
                      onConfigChange={handleConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        simulationConfig?.type === "AC"
                          ? simulationConfig
                          : undefined
                      }
                    />
                  );
                case "Trans":
                  return (
                    <TransConfig
                      onConfigChange={handleConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        simulationConfig?.type === "Transient"
                          ? simulationConfig
                          : undefined
                      }
                    />
                  );
              }
            })()}
          </Flex>
        </div>

        {/* Fixed button at bottom */}
        <Flex
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          height="80px"
          padding="4"
          backgroundColor={useColorModeValue("white", "gray.800")}
          borderTop="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          alignItems="center"
        >
          <Button onClick={handleSimRun} width="100%">
            Run Simulation
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SimulationEditor;
