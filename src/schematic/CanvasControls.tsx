import React from "react";
import { IconButton } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import { Undo2, X, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { useAppStore } from "src/store/appStore";
import type { SchematicEditorCommand } from "./schematicCommands";

type CanvasControlsProps = {
  onEditorCommand: (command: SchematicEditorCommand) => void;
};

const CanvasControls: React.FC<CanvasControlsProps> = ({ onEditorCommand }) => {
  // const inputProfile = useAppStore((s) => s.inputProfile); // Removed profile check
  const isWiring = useAppStore((s) => s.isWiring);
  const isMoving = useAppStore((s) => s.isMoving);
  const editorMode = useAppStore((s) => s.editorMode);
  const resetSchematicModes = useAppStore((s) => s.resetSchematicModes);
  
  // Direct state setters to ensure UI updates immediately if engine messages lag/missing
  const setIsWiring = useAppStore((s) => s.setIsWiring);
  const setIsMoving = useAppStore((s) => s.setIsMoving);

  const showWiring = isWiring || editorMode === "wire";
  const showMoving = isMoving; // Move mode is implied by activity, not just tool selection

  // Show whenever valid active state exists
  if (!showWiring && !showMoving) {
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
      {showWiring && (
        <>
          <Tooltip content="Undo Last Point" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Undo last wire point"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditorCommand("undo-wire-point");
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use robust reset to exit mode
                onEditorCommand("cancel-wire");
                resetSchematicModes();
                setIsWiring(false); // Force update UI
              }}
            >
              <X />
            </IconButton>
          </Tooltip>
        </>
      )}

      {showMoving && (
        <>
          <Tooltip content="Rotate Selection" showArrow openDelay={300}>
            <IconButton
              bg="gray.solid/40"
              _hover={{ bg: "gray.solid/60" }}
              rounded="full"
              size="lg"
              backdropFilter="blur(4px)"
              aria-label="Rotate selection"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditorCommand("rotate");
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditorCommand("flip-horizontal");
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditorCommand("flip-vertical");
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use robust reset to ensure controls disappear
                onEditorCommand("cancel-move");
                resetSchematicModes();
                setIsMoving(false); // Force update UI
              }}
            >
              <X />
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default CanvasControls;
