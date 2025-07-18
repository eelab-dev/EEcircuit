import React from "react";
import { IconButton, Separator } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import ClearSchematicDialog from "./ClearSchematicDialog";
import AddComponentPopover from "./AddComponentPopover";

import {
  Cable,
  CircleDot,
  Eraser,
  FileDown,
  Fullscreen,
  Hand,
  ImageDown,
  MousePointer,
  Move,
  Trash2,
} from "lucide-react";
import { AvailableComponent, sendCommand } from "eecircuit-schematic";

type ActionsProps = {
  availableComponents: AvailableComponent[];
  onExportImage: () => void;
  onSaveSchematic: () => void;
};

const Actions: React.FC<ActionsProps> = ({
  availableComponents,
  onExportImage,
  onSaveSchematic,
}) => {
  const [isCompact, setIsCompact] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleCloseClearDialog = React.useCallback(() => {
    setShowClearDialog(false);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      // Use viewport height units - 45rem is approximately 720px
      const viewportHeight = window.innerHeight;
      const shouldBeCompact = viewportHeight < 40 * 16; // 40rem in pixels (640px)

      console.log(
        "Viewport height:",
        viewportHeight,
        "Should be compact:",
        shouldBeCompact
      );
      setIsCompact(shouldBeCompact);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr 1fr" : "1fr",
        gap: isCompact ? "0.25rem" : "0.5rem",
        backgroundColor: "var(--chakra-colors-gray-800)",
        padding: "0.375rem",
        borderRadius: "0.375rem",
        width: "fit-content",
        maxWidth: isCompact ? "7rem" : "auto",
      }}
    >
      <Tooltip content="Select/Move" showArrow openDelay={300}>
        <IconButton>
          <MousePointer />
        </IconButton>
      </Tooltip>
      <Tooltip content="Pan View" showArrow openDelay={300}>
        <IconButton>
          <Move />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Add Wire" showArrow openDelay={300}>
        <IconButton>
          <Cable />
        </IconButton>
      </Tooltip>
      <AddComponentPopover availableComponents={availableComponents} />
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Remove Selected" showArrow openDelay={300}>
        <IconButton>
          <Eraser />
        </IconButton>
      </Tooltip>
      <Tooltip content="Clear Schematic" showArrow openDelay={300}>
        <IconButton onClick={() => setShowClearDialog(true)}>
          <Trash2 />
        </IconButton>
      </Tooltip>
      <Separator display={isCompact ? "none" : "block"} />
      <Tooltip content="Hand Tool" showArrow openDelay={300}>
        <IconButton>
          <Hand />
        </IconButton>
      </Tooltip>
      <Tooltip content="Fit to Screen" showArrow openDelay={300}>
        <IconButton
          onClick={() => {
            sendCommand({ command: "view", viewType: "fit" });
          }}
        >
          <Fullscreen />
        </IconButton>
      </Tooltip>
      <Tooltip content="Return to Origin" showArrow openDelay={300}>
        <IconButton>
          <CircleDot />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export Image" showArrow openDelay={300}>
        <IconButton onClick={onExportImage}>
          <ImageDown />
        </IconButton>
      </Tooltip>
      <Tooltip content="Export File" showArrow openDelay={300}>
        <IconButton
          onClick={() => {
            onSaveSchematic();
          }}
        >
          <FileDown />
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
