import type { Message } from "./messageStore";

export type MessageInput = Omit<Message, "id" | "timestamp">;
type MessageSink = (message: MessageInput) => void;

let sink: MessageSink | undefined;

export const setMessageSink = (nextSink: MessageSink): (() => void) => {
  sink = nextSink;
  return () => {
    if (sink === nextSink) sink = undefined;
  };
};

export const publishMessage = (message: MessageInput): void => {
  sink?.(message);
};
