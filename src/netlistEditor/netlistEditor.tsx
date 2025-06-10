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

type NetlistEditorProps = {
  netList: string;
  onResultsObtained: (results: ResultType[]) => void;
};

const NetlistEditor: React.FC<NetlistEditorProps> = ({
  netList = "",
  onResultsObtained,
}) => {
  const simType = ["None", "DC", "AC", "Trans"];

  const [windowSize, setWindowSize] = useState({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });

  const [selectedSimType, setSelectedSimType] = useState(simType[0]);
  const [simConfig, setSimConfig] = useState("");
  const [netListToSim, setNetListToSim] = useState(netList);

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
  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setNetListToSim(value);
    }
  }, []);

  useEffect(() => {
    if (selectedSimType === "None") {
      setSimConfig("");
      setNetListToSim(netList);
      return;
    } else {
      const newNetList = netList + "\n\n" + simConfig + "\n\n" + ".end";
      setNetListToSim(newNetList);
    }
  }, [netList, simConfig, selectedSimType]);

  const handleConfigChange = React.useCallback(
    (config: string) => {
      setSimConfig(config);
    },
    [simConfig]
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
      // Assuming onResultsObtained is a prop function to handle results
      // You can replace this with your actual result handling logic
      onResultsObtained([result]);
    } else {
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
        <Suspense fallback={<Skeleton height="100%" width="100%" />}>
          <EditorCustom
            height="100%"
            width="100%"
            language="spice"
            value={netListToSim}
            valueChanged={handleEditor}
            theme={useColorModeValue("light", "dark")}
            key={windowSize.width}
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
                  setSelectedSimType(value.value);
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
                  return <DcConfig onConfigChange={handleConfigChange} />;
                case "AC":
                  return <AcConfig onConfigChange={handleConfigChange} />;
                case "Trans":
                  return <TransConfig onConfigChange={handleConfigChange} />;
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

export default NetlistEditor;
