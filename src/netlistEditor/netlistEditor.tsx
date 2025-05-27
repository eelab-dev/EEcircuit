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

type NetlistEditorProps = { netList: string };

const NetlistEditor: React.FC<NetlistEditorProps> = ({ netList = "" }) => {
  const simType = ["DC", "AC", "Trans"];

  const [windowSize, setWindowSize] = useState({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });

  const [selectedSimType, setSelectedSimType] = useState(simType[0]);

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
    if (value) {
      //setNetList(value);
    }
  }, []);
  return (
    <Flex width="100%" flexDirection={"column"} gap={4}>
      <Suspense fallback={<Skeleton height="40vh" width="100%" />}>
        <EditorCustom
          height="50vh"
          width="100%"
          language="spice"
          value={netList}
          valueChanged={handleEditor}
          theme={useColorModeValue("light", "dark")}
          key={windowSize.width}
        />
      </Suspense>
      <Flex flexDirection="row" gap={4} width="100%">
        <RadioCard.Root
          defaultValue={simType[0]}
          value={selectedSimType}
          gap="4"
          maxW="sm"
          onValueChange={(value: RadioCardValueChangeDetails) => {
            if (value.value) {
              setSelectedSimType(value.value);
            }
          }}
        >
          <RadioCard.Label>Simulation type</RadioCard.Label>
          <Group attached orientation="vertical">
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
            case "DC":
              return <DcConfig />;
            case "AC":
              return <AcConfig />;
            case "Trans":
              return <TransConfig />;
          }
        })()}
      </Flex>
      <Button>Run Simulation</Button>
    </Flex>
  );
};

export default NetlistEditor;
