import { sendCommand, setTheme } from "eecircuit-schematic";
import { StateCreator } from "zustand";
import { getRecommendedInputProfile } from "../utils/deviceDetection";

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
  // Schematic error tracking
  hasSchematicErrors: boolean;
  // One-shot override flag to allow navigating to Simulate despite errors
  overrideSimulateOnNetlistErrorsOnce: boolean;
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
  // Schematic error actions
  setHasSchematicErrors: (hasErrors: boolean) => void;
  resetSchematicErrors: () => void;
  setOverrideSimulateOnNetlistErrorsOnce: (override: boolean) => void;
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
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get
) => {
  const initialTheme = getInitialTheme();
  
  // Apply initial theme to document
  applyThemeToDocument(initialTheme);
  
  // Set up system preference listener
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      set({ isDarkMode: isDark });
      applyThemeToDocument(isDark);
      // Keep schematic canvas theme in sync with system changes
      try {
        setTheme(isDark ? "dark" : "light");
      } catch (err) {
        // [DEBUG-theme-sync] setTheme failed (likely before canvas init)
        console.warn("[DEBUG-theme-sync] setTheme on system change failed:", err);
      }
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
    hasSchematicErrors: false,
    overrideSimulateOnNetlistErrorsOnce: false,

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

      sendCommand({
        command: "setInputProfile",
        profile: newProfile,
      });
    },

    // Theme actions with document class integration
    setIsDarkMode: (isDark) => {
      set({ isDarkMode: isDark });
      applyThemeToDocument(isDark);
      // Propagate theme change to eecircuit schematic
      try {
        setTheme(isDark ? "dark" : "light");
      } catch (err) {
        // [DEBUG-theme-sync] setTheme failed (likely before canvas init)
        console.warn("[DEBUG-theme-sync] setTheme in setIsDarkMode failed:", err);
      }
    },
    toggleTheme: () => {
      const currentMode = get().isDarkMode;
      const newMode = !currentMode;
      set({ isDarkMode: newMode });
      applyThemeToDocument(newMode);
      // Also notify eecircuit schematic of theme change
      try {
        setTheme(newMode ? "dark" : "light");
      } catch (err) {
        // [DEBUG-theme-sync] setTheme failed (likely before canvas init)
        console.warn("[DEBUG-theme-sync] setTheme in toggleTheme failed:", err);
      }
    },

    // Simulation configuration actions
    setMaxWebWorkers: (count) => {
      const clampedCount = Math.max(1, Math.min(count, navigator.hardwareConcurrency || 8));
      set({ maxWebWorkers: clampedCount });
    },

    // Plot reset configuration actions
    setResetVariableSelectionsOnNewSim: (reset) => set({ resetVariableSelectionsOnNewSim: reset }),
    setResetPlotStateOnNewSim: (reset) => set({ resetPlotStateOnNewSim: reset }),

    // Schematic error actions
    setHasSchematicErrors: (hasErrors) => set({ hasSchematicErrors: hasErrors }),
    resetSchematicErrors: () => set({ hasSchematicErrors: false }),
    setOverrideSimulateOnNetlistErrorsOnce: (override) =>
      set({ overrideSimulateOnNetlistErrorsOnce: override === true }),
  };
};
