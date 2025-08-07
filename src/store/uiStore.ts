import { sendCommand } from "eecircuit-schematic";
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
}

export type UiSlice = UiState & UiActions;

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get
) => ({
  // Initial state - automatically detect device type and system theme
  inputProfile: getRecommendedInputProfile(),
  dragBox: false,
  showDevMessages: false,
  isSchematicLoading: false,
  schematicLoadingMessage: "Loading schematic...",
  isDarkMode: typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches 
    : false,

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

  // Theme actions
  setIsDarkMode: (isDark) => set({ isDarkMode: isDark }),
  toggleTheme: () => {
    const currentMode = get().isDarkMode;
    set({ isDarkMode: !currentMode });
  },
});
