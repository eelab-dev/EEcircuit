import React from "react";
import { Kbd, HStack, Text, Stack } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster.tsx";

interface NavigatorWithKeyboard extends Navigator {
  keyboard?: {
    lock?: (keys: string[]) => Promise<void>;
  };
}

interface FullscreenInstructions {
  browserName: string;
  shortcut: string;
  alternativeShortcut: string;
  isMac: boolean;
}

/**
 * Detects browser and platform to generate appropriate fullscreen instructions
 */
export const getFullscreenInstructions = (): FullscreenInstructions => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = /mac|darwin/.test(userAgent) || /macintosh/.test(userAgent);

  // Browser detection
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
  const isEdge = /edge|edg/.test(userAgent);

  let browserName = "your browser";
  let shortcut = isMac ? "⌘+Ctrl+F" : "F11";
  let alternativeShortcut = "";

  if (isSafari) {
    browserName = "Safari";
    shortcut = isMac ? "🌐 Fn+F" : "F11";
  } else if (isFirefox) {
    browserName = "Firefox";
    shortcut = "F11";
  } else if (isChrome) {
    browserName = "Chrome";
    shortcut = "F11";
  } else if (isEdge) {
    browserName = "Edge";
    shortcut = "F11";
  }

  // Additional instructions for Mac
  if (isMac && !isSafari) {
    alternativeShortcut = "Fn+F11";
  }

  return {
    browserName,
    shortcut,
    alternativeShortcut,
    isMac,
  };
};

/**
 * Creates a visual display of keyboard shortcuts using Kbd components
 */
export const createKeyboardShortcutDisplay = (
  shortcut: string,
  alternativeShortcut?: string
): React.ReactElement => {
  // Handle shortcuts that start with icons (like ⌨ Fn+F)
  const parseShortcut = (shortcutStr: string) => {
    const parts = shortcutStr.split("+").map((key) => key.trim());
    return parts;
  };

  const keys = parseShortcut(shortcut);
  const altKeys = alternativeShortcut ? parseShortcut(alternativeShortcut) : [];

  return (
    <HStack gap={1} flexWrap="wrap">
      <Text as="span">Press</Text>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Kbd size="sm" variant="outline">
            {key}
          </Kbd>
          {index < keys.length - 1 && <Text as="span">+</Text>}
        </React.Fragment>
      ))}
      {alternativeShortcut && (
        <>
          <Text as="span">or</Text>
          {altKeys.map((key, index) => (
            <React.Fragment key={index}>
              <Kbd size="sm" variant="outline">
                {key}
              </Kbd>
              {index < altKeys.length - 1 && <Text as="span">+</Text>}
            </React.Fragment>
          ))}
        </>
      )}
    </HStack>
  );
};

/**
 * Shows an informative toast for manual fullscreen activation
 */
export const showFullscreenFallbackToast = (): void => {
  const instructions = getFullscreenInstructions();

  toaster.create({
    title: "Automatic Fullscreen Not Supported",
    description: (
      <Stack gap={2}>
        <Text>
          Your browser ({instructions.browserName}) doesn&apos;t support
          automatic fullscreen with keyboard lock.
        </Text>
        {createKeyboardShortcutDisplay(
          instructions.shortcut,
          instructions.alternativeShortcut
        )}
        <Text fontSize="sm" color="fg.subtle">
          {instructions.browserName === "Safari"
            ? "In Safari, you can also use View → Enter Full Screen from the menu bar"
            : instructions.browserName === "Firefox"
              ? "In Firefox, you can also right-click and select 'Fullscreen' or use the View menu"
              : "You can also use your browser's View menu to enter fullscreen mode"}
        </Text>
      </Stack>
    ),
    duration: 12000, // 12 seconds
    meta: { closable: true }, // Allow early closing
  });
};

/**
 * Checks if keyboard lock API is available
 */
export const isKeyboardLockSupported = (): boolean => {
  const nav = navigator as NavigatorWithKeyboard;
  return !!(nav.keyboard && nav.keyboard.lock);
};

/**
 * Enhanced fullscreen handler with keyboard lock support and fallback toast
 */
export const handleFullscreen = async (
  isCurrentlyFullscreen: boolean
): Promise<void> => {
  if (isCurrentlyFullscreen) {
    // Exit fullscreen
    try {
      await document.exitFullscreen();
    } catch (err) {
      console.error(
        `Error exiting fullscreen: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    // Enter fullscreen
    try {
      // Check if keyboard lock API is available
      if (isKeyboardLockSupported()) {
        const nav = navigator as NavigatorWithKeyboard;
        // Lock the escape key and enter fullscreen
        await nav.keyboard!.lock!(["Escape"]);
        await document.documentElement.requestFullscreen();
      } else {
        // Fallback: show enhanced toast notification for manual fullscreen
        showFullscreenFallbackToast();
      }
    } catch (err) {
      console.error(
        `Error entering fullscreen: ${err instanceof Error ? err.message : String(err)}`
      );
      // Fallback to standard fullscreen without keyboard lock
      try {
        await document.documentElement.requestFullscreen();
      } catch (fallbackErr) {
        console.error(
          `Fallback fullscreen also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
        );
      }
    }
  }
};
