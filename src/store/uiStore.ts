import { sendCommand } from "eecircuit-schematic";
import { StateCreator } from "zustand";

// UI state and actions
export interface UiState {
  inputProfile: "mouse" | "trackpad";
  dragBox: boolean;
  showDevMessages: boolean;
}

export interface UiActions {
  setInputProfile: (profile: "mouse" | "trackpad") => void;
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
    const newProfile = currentProfile === "mouse" ? "trackpad" : "mouse";
    set({ inputProfile: newProfile });

    sendCommand({
      command: "setInputProfile",
      profile: newProfile,
    });
  },
});
