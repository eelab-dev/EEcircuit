import React from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import {
  Mouse,
  Touchpad,
  Download,
  Smartphone,
  Sun,
  Moon,
  Github,
  Expand,
  SquareX,
  RotateCw,
} from "lucide-react";

interface HeaderButtonsProps {
  handleSaveFile: () => void;
  setShowClearDialog: (show: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  inputProfile: "mouse" | "trackpad" | "touchscreen";
  toggleInputProfile: () => void;
  fullscreen: boolean;
  fullscreenHandler: () => void;
}

const HeaderButtons: React.FC<HeaderButtonsProps> = ({
  handleSaveFile,
  setShowClearDialog,
  isDarkMode,
  toggleTheme,
  inputProfile,
  toggleInputProfile,
  fullscreen,
  fullscreenHandler,
}) => {
  return (
    <Flex alignItems="center" gap={2}>
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

      {/* Clear Schematic Button */}
      <Tooltip
        showArrow
        content="Clear schematic"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Clear schematic"
          size="sm"
          variant="ghost"
          onClick={() => setShowClearDialog(true)}
        >
          <RotateCw size={16} />
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

      {/* Subtle divider */}
      <Box
        width="1px"
        height="20px"
        bg="gray.300"
        _dark={{ bg: "gray.600" }}
        mx={1}
      />

      {/* GitHub Button */}
      <Tooltip
        showArrow
        content="Visit EEcircuit on GitHub"
        positioning={{ placement: "bottom" }}
      >
        <IconButton
          aria-label="Visit EEcircuit on GitHub"
          size="sm"
          variant="ghost"
          onClick={() =>
            window.open("https://github.com/eelab-dev/EEcircuit", "_blank")
          }
        >
          <Github size={16} />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};

export default HeaderButtons;