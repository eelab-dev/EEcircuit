import React from "react";
import { IconButton } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import * as ee from "eecircuit-schematic";
import { Undo2, X, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { useAppStore } from "src/store/appStore";

const TouchControls: React.FC = () => {
  const inputProfile = useAppStore((s) => s.inputProfile);
  const isWiring = useAppStore((s) => s.isWiring);
  const isMoving = useAppStore((s) => s.isMoving);

  // Only show in touchscreen mode when actively wiring or moving
  if (inputProfile !== "touchscreen" || (!isWiring && !isMoving)) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "0.5rem",
        padding: "0.375rem",
        width: "fit-content",
      }}
    >
      {isWiring && (
        <>
          <Tooltip content="Undo Last Point" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Undo last wire point"
              onClick={() => ee.undoLastWirePoint()}
            >
              <Undo2 />
            </IconButton>
          </Tooltip>
          <Tooltip content="Cancel Wire" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Cancel wire"
              onClick={() => ee.cancelWire()}
            >
              <X />
            </IconButton>
          </Tooltip>
        </>
      )}

      {isMoving && (
        <>
          <Tooltip content="Rotate Selection" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Rotate selection"
              onClick={() => ee.rotateSelected()}
            >
              <RotateCw />
            </IconButton>
          </Tooltip>
          <Tooltip content="Flip Horizontal" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Flip horizontal"
              onClick={() => ee.flipHorizontal()}
            >
              <FlipHorizontal />
            </IconButton>
          </Tooltip>
          <Tooltip content="Flip Vertical" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Flip vertical"
              onClick={() => ee.flipVertical()}
            >
              <FlipVertical />
            </IconButton>
          </Tooltip>
          <Tooltip content="Cancel Move" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Cancel move"
              onClick={() => ee.cancelMove()}
            >
              <X />
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default TouchControls;
