import { StateCreator } from "zustand";

export type MessageCategory = "Schematic" | "Simulation" | "Plotting";
export type MessageType = "error" | "warning" | "info" | "success";

export interface Message {
  id: string;
  text: string;
  type: MessageType;
  category: MessageCategory;
  timestamp: number;
  mLevel?: "user" | "dev"; // Optional for backward compatibility/dev messages
}

export interface MessageState {
  messages: Message[];
  // Note: showDevMessages is managed in uiStore to maintain separation of concerns regarding UI preferences vs message data.
}

export interface MessageActions {
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  removeMessage: (id: string) => void;
  clearMessages: (category?: MessageCategory) => void;
}

export type MessageSlice = MessageState & MessageActions;

export const createMessageSlice: StateCreator<MessageSlice, [], [], MessageSlice> = (
  set
) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        },
      ],
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  clearMessages: (category) =>
    set((state) => ({
      messages: category
        ? state.messages.filter((m) => m.category !== category)
        : [],
    })),
});
