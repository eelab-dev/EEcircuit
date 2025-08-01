import { sendCommand } from "eecircuit-schematic";
import { StateCreator } from "zustand";

// UI state and actions
export interface UiState {
  inputProfile: "mouse" | "trackpad" | "touchscreen";
  dragBox: boolean;
  showDevMessages: boolean;
}

export interface UiActions {
  setInputProfile: (profile: "mouse" | "trackpad" | "touchscreen") => void;
  setDragBox: (show: boolean) => void;
  setShowDevMessages: (show: boolean) => void;
  toggleInputProfile: () => void;
}

export type UiSlice = UiState & UiActions;

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get
) => ({
  // Initial state
  inputProfile: "trackpad",
  dragBox: false,
  showDevMessages: false,

  // Actions
  setInputProfile: (profile) => set({ inputProfile: profile }),
  setDragBox: (show) => set({ dragBox: show }),
  setShowDevMessages: (show) => set({ showDevMessages: show }),

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
});
