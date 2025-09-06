import React from "react";
import { IconButton, Separator } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import AddComponentPopover from "./AddComponentPopover";
import debounce from "lodash.debounce";
import * as ee from "eecircuit-schematic";
import type { AvailableComponent } from "eecircuit-schematic";

import {
  Cable,
  CircleDot,
  Eraser,
  Fullscreen,
  Hand,
  ImageDown,
  MousePointer,
  Move,
  Keyboard,
  Type,
} from "lucide-react";
import { actionBarTheme } from "src/styles/uiThemes";
import ToggleActionButton from "./ToggleActionButton";
import { useAppStore } from "src/store/appStore";

type ActionsProps = {
  availableComponents: AvailableComponent[];
  onExportImage: () => void;
  onShowShortcuts: () => void;
};

const Actions: React.FC<ActionsProps> = ({
  availableComponents,
  onExportImage,
  onShowShortcuts,
}) => {
  const editorMode = useAppStore((s) => s.editorMode);
  const setEditorMode = useAppStore((s) => s.setEditorMode);

  const [isCompact, setIsCompact] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Debounce the resize handler to reduce excessive logging during resize operations
    const handleResize = debounce(() => {
      // Use viewport height units - 45rem is approximately 720px
      const viewportHeight = window.innerHeight;
      const shouldBeCompact = viewportHeight < 40 * 16; // 40rem in pixels (640px)

      // Only log when compact state actually changes to reduce console noise
      if (shouldBeCompact !== isCompact) {
        console.log(
          "Viewport height:",
          viewportHeight,
          "Should be compact:",
          shouldBeCompact
        );
      }
      setIsCompact(shouldBeCompact);
    }, 100); // Debounce resize events by 100ms

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel(); // Cancel any pending debounced calls
    };
  }, [isCompact]); // Add isCompact to dependencies to track state changes

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr 1fr" : "1fr",
        gap: isCompact ? "0.25rem" : "0.5rem",
        padding: "0.375rem",
        borderRadius: "0.375rem",
        width: "fit-content",
        maxWidth: isCompact ? "7rem" : "auto",
      }}
    >
      <Tooltip content="Select" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg}>
          <MousePointer />
        </IconButton>
      </Tooltip>
      <AddComponentPopover availableComponents={availableComponents} />

      <ToggleActionButton
        tooltip="Wire (W)"
        pressed={editorMode === "wire"}
        onToggle={(next) => setEditorMode(next ? "wire" : "none")}
      >
        <Cable />
      </ToggleActionButton>

      <ToggleActionButton
        tooltip="Move (M)"
        pressed={editorMode === "move"}
        onToggle={(next) => setEditorMode(next ? "move" : "none")}
      >
        <Move />
      </ToggleActionButton>

      <ToggleActionButton
        tooltip="Text (T)"
        pressed={editorMode === "text"}
        onToggle={(next) => setEditorMode(next ? "text" : "none")}
      >
        <Type />
      </ToggleActionButton>

      <ToggleActionButton
        tooltip="Remove (Shift+D)"
        pressed={editorMode === "delete"}
        onToggle={(next) => setEditorMode(next ? "delete" : "none")}
      >
        <Eraser />
      </ToggleActionButton>

      <Separator display={isCompact ? "none" : "block"} />
      {/* Navigation */}

      <Tooltip content="Hand Tool" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg}>
          <Hand />
        </IconButton>
      </Tooltip>

      <Tooltip content="Fit to Screen (F)" showArrow openDelay={300}>
        <IconButton
          bg={actionBarTheme.buttonIconBg}
          onClick={() => {
            ee.sendCommand({ command: "view", viewType: "fit" });
          }}
        >
          <Fullscreen />
        </IconButton>
      </Tooltip>

      <Tooltip content="Return to Origin (O)" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg}>
          <CircleDot />
        </IconButton>
      </Tooltip>

      <Separator display={isCompact ? "none" : "block"} />
      {/* Misc */}

      <Tooltip content="Export Image" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg} onClick={onExportImage}>
          <ImageDown />
        </IconButton>
      </Tooltip>

      <Tooltip
        content="Keyboard Shortcuts (Shift+H or Ctrl+H)"
        showArrow
        openDelay={300}
      >
        <IconButton bg={actionBarTheme.buttonIconBg} onClick={onShowShortcuts}>
          <Keyboard />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default Actions;
