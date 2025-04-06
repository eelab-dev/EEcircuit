import React, { useEffect, useRef } from "react";
import { initCanvas, MessageToApp, resizeOffscreen } from "eecircuit-schematic";
import { Box, Flex, Float, IconButton } from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";

import { ArrowBigRight, Expand, SquareX } from "lucide-react";
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

  const [fullscreen, setFullscreen] = React.useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvasRef.current && !initializedRef.current) {
      console.log("Canvas ref is set:", canvasRef.current);
      initCanvas(canvasRef.current, msgCallback);
      initializedRef.current = true;
    }
  }, []);

  const buttonHandler = React.useCallback(() => {
    console.log("Button clicked");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      if (!canvasRef.current) return;

      // Get the computed size

      // Only update if changed

      resizeOffscreen(parent.getBoundingClientRect());

      // first set the canvas size small to find the parent size otherwise parent size is
      // distorted because of fixed canvas size before resizing

      canvas.style.width = 100 + "px";
      canvas.style.height = 100 + "px";

      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
    };

    // Initial resize
    resizeCanvas();

    // Resize on window resize
    window.addEventListener("resize", resizeCanvas);

    // Optional: Resize on parent resize (more precise)
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement!);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver.disconnect();
    };
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

  const fullscreenHandler = React.useCallback(() => {
    if (!canvasRef.current) return;
    if (fullscreen) {
      document.exitFullscreen().catch((err) => {
        console.error(`Error exiting fullscreen: ${err.message}`);
      });
      setFullscreen(false);
    } else {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
      setFullscreen(true);
      resizeOffscreen(canvasRef.current.getBoundingClientRect());
    }
  }, [fullscreen]);

  return (
    <Flex direction="column" height={"100%"} flexGrow={0}>
      <Box position="relative" flex="1" minHeight={0}>
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
          <IconButton aria-label="Fullscreen" onClick={fullscreenHandler}>
            {!fullscreen ? <Expand /> : <SquareX />}
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
