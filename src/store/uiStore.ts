import type { SliceCreator } from "./storeTypes";
import { getRecommendedInputProfile } from "../utils/deviceDetection";
import { SettingsCategory } from "../types/commonTypes";

const WHEEL_PAN_DIRECTIONS_STORAGE_KEY = "eecircuit-wheel-pan-directions";

type WheelPanDirectionPreferences = {
  reverseHorizontalWheelPan: boolean;
  reverseVerticalWheelPan: boolean;
};

const defaultWheelPanDirectionPreferences = (): WheelPanDirectionPreferences => ({
  reverseHorizontalWheelPan: false,
  reverseVerticalWheelPan: false,
});

function loadWheelPanDirectionPreferences(): WheelPanDirectionPreferences {
  if (typeof window === "undefined") return defaultWheelPanDirectionPreferences();
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WHEEL_PAN_DIRECTIONS_STORAGE_KEY) ?? "null");
    if (typeof parsed === "object" && parsed !== null) {
      const value = parsed as Record<string, unknown>;
      return {
        reverseHorizontalWheelPan: value.reverseHorizontalWheelPan === true,
        reverseVerticalWheelPan: value.reverseVerticalWheelPan === true,
      };
    }
  } catch (error) {
    console.warn("Failed to load wheel pan direction settings from localStorage:", error);
  }
  return defaultWheelPanDirectionPreferences();
}

function saveWheelPanDirectionPreferences(preferences: WheelPanDirectionPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WHEEL_PAN_DIRECTIONS_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Failed to save wheel pan direction settings to localStorage:", error);
  }
}

// UI state and actions
export interface UiState {
  inputProfile: "mouse" | "trackpad" | "touchscreen";
  dragBox: boolean;
  showDevMessages: boolean;
  isSchematicLoading: boolean;
  schematicLoadingMessage: string;
  isDarkMode: boolean;
  maxWebWorkers: number;
  resetVariableSelectionsOnNewSim: boolean;
  resetPlotStateOnNewSim: boolean;
  reverseHorizontalWheelPan: boolean;
  reverseVerticalWheelPan: boolean;
  // Schematic error tracking
  hasSchematicErrors: boolean;
  // One-shot override flag to allow navigating to Simulate despite errors
  overrideSimulateOnNetlistErrorsOnce: boolean;
  activeSettingsCategory: SettingsCategory;
  isWiring: boolean;
  isMoving: boolean;
}

export interface UiActions {
  setInputProfile: (profile: "mouse" | "trackpad" | "touchscreen") => void;
  setDragBox: (show: boolean) => void;
  setShowDevMessages: (show: boolean) => void;
  setIsSchematicLoading: (loading: boolean) => void;
  setSchematicLoadingMessage: (message: string) => void;
  toggleInputProfile: () => void;
  setIsDarkMode: (isDark: boolean) => void;
  toggleTheme: () => void;
  setMaxWebWorkers: (count: number) => void;
  setResetVariableSelectionsOnNewSim: (reset: boolean) => void;
  setResetPlotStateOnNewSim: (reset: boolean) => void;
  setWheelPanDirectionPreferences: (preferences: WheelPanDirectionPreferences) => void;
  // Schematic error actions
  setHasSchematicErrors: (hasErrors: boolean) => void;
  resetSchematicErrors: () => void;
  setOverrideSimulateOnNetlistErrorsOnce: (override: boolean) => void;
  setActiveSettingsCategory: (category: SettingsCategory) => void;
  setIsWiring: (isWiring: boolean) => void;
  setIsMoving: (isMoving: boolean) => void;
}

export type UiSlice = UiState & UiActions;

// Helper function to apply theme class to document element
const applyThemeToDocument = (isDark: boolean) => {
  if (typeof window !== 'undefined') {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(isDark ? 'dark' : 'light');
  }
};

// Helper function to detect initial theme preference
const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check URL parameters for explicit theme override
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get('theme');
  if (themeParam === 'dark') return true;
  if (themeParam === 'light') return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const createUiSlice: SliceCreator<UiSlice, UiSlice> = (
  set,
  get
) => {
  const initialTheme = getInitialTheme();
  const initialWheelPanDirections = loadWheelPanDirectionPreferences();
  
  // Apply initial theme to document
  applyThemeToDocument(initialTheme);
  // Set up system preference listener
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      set({ isDarkMode: isDark });
      applyThemeToDocument(isDark);
    };
    
    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleThemeChange);
    }
  }

  return {
    // Initial state - automatically detect device type and system theme
    inputProfile: getRecommendedInputProfile(),
    dragBox: false,
    showDevMessages: false,
    isSchematicLoading: false,
    schematicLoadingMessage: "Loading schematic...",
    isDarkMode: initialTheme,
    maxWebWorkers: Math.min(4, navigator.hardwareConcurrency || 4),
    resetVariableSelectionsOnNewSim: false,
    resetPlotStateOnNewSim: false,
    reverseHorizontalWheelPan: initialWheelPanDirections.reverseHorizontalWheelPan,
    reverseVerticalWheelPan: initialWheelPanDirections.reverseVerticalWheelPan,
    hasSchematicErrors: false,
    overrideSimulateOnNetlistErrorsOnce: false,
    activeSettingsCategory: "simulation",
    isWiring: false,
    isMoving: false,

    // Actions
    setInputProfile: (profile) => set({ inputProfile: profile }),
    setDragBox: (show) => set({ dragBox: show }),
    setShowDevMessages: (show) => set({ showDevMessages: show }),
    setIsSchematicLoading: (loading) => set({ isSchematicLoading: loading }),
    setSchematicLoadingMessage: (message) => set({ schematicLoadingMessage: message }),

    toggleInputProfile: () => {
      const currentProfile = get().inputProfile;
      let newProfile: "mouse" | "trackpad" | "touchscreen";
      
      if (currentProfile === "mouse") {
        newProfile = "trackpad";
      } else if (currentProfile === "trackpad") {
        newProfile = "touchscreen";
      } else {
        newProfile = "mouse";
      }
      
      set({ inputProfile: newProfile });

    },

    // Theme actions with document class integration
    setIsDarkMode: (isDark) => {
      set({ isDarkMode: isDark });
      applyThemeToDocument(isDark);
    },
    toggleTheme: () => {
      const currentMode = get().isDarkMode;
      const newMode = !currentMode;
      set({ isDarkMode: newMode });
      applyThemeToDocument(newMode);
    },

    // Simulation configuration actions
    setMaxWebWorkers: (count) => {
      const clampedCount = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 8));
      set({ maxWebWorkers: clampedCount });
    },

    // Plot reset configuration actions
    setResetVariableSelectionsOnNewSim: (reset) => set({ resetVariableSelectionsOnNewSim: reset }),
    setResetPlotStateOnNewSim: (reset) => set({ resetPlotStateOnNewSim: reset }),
    setWheelPanDirectionPreferences: (preferences) => {
      set(preferences);
      saveWheelPanDirectionPreferences(preferences);
    },

    // Schematic error actions
    setHasSchematicErrors: (hasErrors) => set({ hasSchematicErrors: hasErrors }),
    resetSchematicErrors: () => set({ hasSchematicErrors: false }),
    setOverrideSimulateOnNetlistErrorsOnce: (override) =>
      set({ overrideSimulateOnNetlistErrorsOnce: override === true }),
    setActiveSettingsCategory: (category) => set({ activeSettingsCategory: category }),
    setIsWiring: (isWiring) => set({ isWiring }),
    setIsMoving: (isMoving) => set({ isMoving }),
  };
};
