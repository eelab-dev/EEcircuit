import React, { useRef } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import {
  Mouse,
  Touchpad,
  Download,
  Upload,
  Smartphone,
  Sun,
  Moon,
  Expand,
  SquareX,
  Settings,
  FilePlus,
  Info,
} from "lucide-react";
import StatusIcon from "./StatusIcon";

interface HeaderButtonsProps {
  handleSaveFile: () => void;
  onOpenFile: (file: File) => void;
  setShowNewSchematicDialog: (show: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  inputProfile: "mouse" | "trackpad" | "touchscreen";
  toggleInputProfile: () => void;
  fullscreen: boolean;
  fullscreenHandler: () => void;
  setShowConfigDialog: (show: boolean) => void;
  setShowAboutDialog: (show: boolean) => void;
}

const HeaderButtons: React.FC<HeaderButtonsProps> = ({
  handleSaveFile,
  onOpenFile,
  setShowNewSchematicDialog,
  isDarkMode,
  toggleTheme,
  inputProfile,
  toggleInputProfile,
  fullscreen,
  fullscreenHandler,
  setShowConfigDialog,
  setShowAboutDialog,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
    // Reset input value so selecting the same file twice will trigger change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Flex alignItems="center" gap={2}>
      {/* New Schematic Button */}
      <Tooltip
        showArrow
        content="New Schematic"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="New Schematic"
          size="sm"
          variant="ghost"
          onClick={() => setShowNewSchematicDialog(true)}
        >
          <FilePlus size={16} />
        </IconButton>
      </Tooltip>
      {/* Hidden file input for Open button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Open File Button */}
      <Tooltip
        showArrow
        content="Open EEcircuit file from disk"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Open EEcircuit file"
          size="sm"
          variant="ghost"
          onClick={handleOpenClick}
        >
          <Upload size={16} />
        </IconButton>
      </Tooltip>

      {/* Save File Button */}
      <Tooltip
        showArrow
        content="Save complete EEcircuit file with schematic and simulation configurations"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Save EEcircuit file"
          size="sm"
          variant="ghost"
          onClick={handleSaveFile}
        >
          <Download size={16} />
        </IconButton>
      </Tooltip>



      {/* Dark Mode Toggle Button */}
      <Tooltip
        showArrow
        content="Toggle light/dark mode"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Toggle color mode"
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
      </Tooltip>

      {/* Input Profile Toggle Button */}
      <Tooltip
        showArrow
        content={
          inputProfile === "mouse"
            ? "Mouse: Shift+wheel zoom, wheel pan when zoomed"
            : inputProfile === "trackpad"
              ? "Trackpad: Ctrl+scroll zoom, scroll pan when zoomed"
              : "Touchscreen: Pinch zoom, single-finger drag pan when zoomed"
        }
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label={`Current input profile: ${inputProfile} - Click to cycle`}
          size="sm"
          variant="ghost"
          onClick={toggleInputProfile}
        >
          {inputProfile === "mouse" ? (
            <Mouse size={16} />
          ) : inputProfile === "trackpad" ? (
            <Touchpad size={16} />
          ) : (
            <Smartphone size={16} />
          )}
        </IconButton>
      </Tooltip>

      {/* Fullscreen Button */}
      <Tooltip
        showArrow
        content={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Fullscreen"
          size="sm"
          variant="ghost"
          onClick={fullscreenHandler}
        >
          {!fullscreen ? <Expand size={16} /> : <SquareX size={16} />}
        </IconButton>
      </Tooltip>

      {/* Simulation Settings Button */}
      <Tooltip
        showArrow
        content="Simulation Settings"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Simulation Settings"
          size="sm"
          variant="ghost"
          onClick={() => setShowConfigDialog(true)}
        >
          <Settings size={16} />
        </IconButton>
      </Tooltip>

      {/* Global Status Icon */}
      <StatusIcon />

      {/* Subtle divider */}
      <Box
        width="1px"
        height="20px"
        bg="gray.300"
        _dark={{ bg: "gray.600" }}
        mx={1}
      />

      {/* About/Info Button */}
      <Tooltip
        showArrow
        content="About EEcircuit"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="About EEcircuit"
          size="sm"
          variant="ghost"
          onClick={() => setShowAboutDialog(true)}
        >
          <Info size={16} />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};

export default HeaderButtons;
