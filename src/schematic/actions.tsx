import React from "react";
import { IconButton, Separator } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import ClearSchematicDialog from "./ClearSchematicDialog";
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
  Trash2,
  Keyboard,
} from "lucide-react";
import { AvailableComponent, sendCommand } from "eecircuit-schematic";

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
  const buttonBg = "gray.solid/90";
  const [isCompact, setIsCompact] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleCloseClearDialog = React.useCallback(() => {
    setShowClearDialog(false);
  }, []);

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
        backgroundColor: "gray.800/60",
        padding: "0.375rem",
        borderRadius: "0.375rem",
        width: "fit-content",
        maxWidth: isCompact ? "7rem" : "auto",
      }}
    >
      <Tooltip content="Select/Move" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <MousePointer />
        </IconButton>
      </Tooltip>
      <Tooltip content="Pan View" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <Move />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Add Wire" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <Cable />
        </IconButton>
      </Tooltip>
      <AddComponentPopover availableComponents={availableComponents} />
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Remove Selected" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <Eraser />
        </IconButton>
      </Tooltip>
      <Tooltip content="Clear Schematic" showArrow openDelay={300}>
        <IconButton bg={buttonBg} onClick={() => setShowClearDialog(true)}>
          <Trash2 />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Hand Tool" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <Hand />
        </IconButton>
      </Tooltip>
      <Tooltip content="Fit to Screen" showArrow openDelay={300}>
        <IconButton
          bg={buttonBg}
          onClick={() => {
            sendCommand({ command: "view", viewType: "fit" });
          }}
        >
          <Fullscreen />
        </IconButton>
      </Tooltip>
      <Tooltip content="Return to Origin" showArrow openDelay={300}>
        <IconButton bg={buttonBg}>
          <CircleDot />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export Image" showArrow openDelay={300}>
        <IconButton bg={buttonBg} onClick={onExportImage}>
          <ImageDown />
        </IconButton>
      </Tooltip>
      <Tooltip
        content="Keyboard Shortcuts (Shift+H or Ctrl+H)"
        showArrow
        openDelay={300}
      >
        <IconButton bg={buttonBg} onClick={onShowShortcuts}>
          <Keyboard />
        </IconButton>
      </Tooltip>

      {/* Clear Schematic Confirmation Dialog */}
      <ClearSchematicDialog
        isOpen={showClearDialog}
        onClose={handleCloseClearDialog}
      />
    </div>
  );
};

export default Actions;
