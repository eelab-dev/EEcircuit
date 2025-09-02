import React from "react";
import { IconButton, Separator } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import AddComponentPopover from "./AddComponentPopover";
import debounce from "lodash.debounce";

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
} from "lucide-react";
import * as ee from "eecircuit-schematic";
import { actionBarTheme } from "src/styles/uiThemes";
import ToggleActionButton from "./ToggleActionButton";

type ActionsProps = {
  availableComponents: ee.AvailableComponent[];
  onExportImage: () => void;
  onShowShortcuts: () => void;
  // When this number changes, reset all toggle states to defaults
  resetSignal?: number;
};

const Actions: React.FC<ActionsProps> = ({
  availableComponents,
  onExportImage,
  onShowShortcuts,
  resetSignal,
}) => {
  // Default toggle states
  const DEFAULTS = React.useMemo(() => ({
    wire: false,
  }), []);

  // Controlled pressed states for toggles
  const [wirePressed, setWirePressed] = React.useState<boolean>(DEFAULTS.wire);

  // Reset pressed states to defaults when resetSignal changes
  React.useEffect(() => {
    if (resetSignal === undefined) return;
    setWirePressed(DEFAULTS.wire);
  }, [resetSignal, DEFAULTS]);

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
      <Tooltip content="Move (M)" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg}>
          <Move />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <ToggleActionButton
        tooltip="Wire (W)"
        pressed={wirePressed}
        onToggle={(next) => {
          setWirePressed(next);
        }}
        onEnable={() => ee.setWireMode(true)}
        onDisable={() => ee.setWireMode(false)}
      >
        <Cable />
      </ToggleActionButton>
      <AddComponentPopover availableComponents={availableComponents} />
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Remove (Shift+D)" showArrow openDelay={300}>
        <IconButton bg={actionBarTheme.buttonIconBg}>
          <Eraser />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
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
