import React, { useEffect, useRef } from "react";
import { initCanvas, MessageToApp, resizeOffscreen } from "eecircuit-schematic";
import { Box, Flex, Float, IconButton } from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";

import { ArrowBigRight, Expand } from "lucide-react";
import Actions from "./actions";

type SchematicProps = {
  onNetlistExported: (netlist: string) => void;
};

const Schematic: React.FC<SchematicProps> = ({ onNetlistExported }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedRef = useRef<boolean>(false);
  const [coord, setCoord] = React.useState({ x: 0, y: 0 });
  const [pointerInfo, setPointerInfo] = React.useState<string>("");
  const [selectedItemName, setSelectedItemName] = React.useState<string>("");
  const [canvasSize, setCanvasSize] = React.useState({
    width: 0,
    height: 0,
  });

  // Resize handler
  useEffect(() => {
    function handleResize() {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvasRef.current && !initializedRef.current) {
      console.log("Canvas ref is set:", canvasRef.current);
      initCanvas(canvasRef.current, msgCallback);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    resizeOffscreen(canvasRef.current);
  }, [canvasSize]);

  const buttonHandler = React.useCallback(() => {
    console.log("Button clicked");
  }, []);

  const msgCallback = React.useCallback((msg: MessageToApp) => {
    switch (msg.type) {
      case "pointerCoords":
        setCoord({ x: msg.pointerCoords.x, y: msg.pointerCoords.y });
        break;
      case "pointerInfo":
        setPointerInfo(msg.pointerInfo);
        break;
      case "selectedItem":
        setSelectedItemName(msg.selectedItemName);
        break;
      case "netList":
        onNetlistExported(msg.netList);
        break;
    }
  }, []);

  return (
    <Flex direction="column" height={"100%"}>
      <Box position="relative" flex="1" overflow="hidden">
        <Float offset="10" placement="middle-start">
          <Actions />
        </Float>
        <canvas
          ref={canvasRef}
          style={{
            border: "solid 1px red",
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        <Float offset="10">
          <IconButton>
            <Expand />
          </IconButton>
        </Float>
      </Box>

      <Flex spaceX={2} direction="row">
        <Button>{`X:${coord.x}, Y:${coord.y}`}</Button>
        <Button>{pointerInfo}</Button>
        <Button>{selectedItemName}</Button>
        <Box flex="1" />
        <Button>Status</Button>
        <Box flex="1" />
        <Button onClick={buttonHandler}>
          Send to Netlist <ArrowBigRight />
        </Button>
      </Flex>
    </Flex>
  );
};

export default Schematic;
