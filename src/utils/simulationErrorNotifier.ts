import { publishMessage } from "../store/messageBus";

type ErrorSource = string | string[] | undefined | null;

const normalizeMessages = (sources: ErrorSource[]): string[] => {
  const collected = sources.flatMap((source) => {
    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source === "string") {
      return [source];
    }

    return [];
  });

  return Array.from(
    new Set(
      collected
        .map((message) => message.trim())
        .filter((message) => Boolean(message.length))
    )
  );
};

export const notifySimulationErrors = (...sources: ErrorSource[]): void => {
  const messages = normalizeMessages(sources);

  if (messages.length === 0) {
    return;
  }

  const isNote = messages.every(
    (message) => message.startsWith("Note:") || message.includes(": Note:")
  );
  messages.forEach((msg) => {
    publishMessage({
      text: msg,
      type: isNote ? "info" : "error",
      category: "Simulation",
      mLevel: "user",
    });
  });
};
