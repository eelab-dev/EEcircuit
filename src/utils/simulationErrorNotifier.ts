import { toaster } from "../components/ui/toaster.tsx";
import { useAppStore } from "../store/appStore";

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

const formatBulletedList = (messages: string[]): string =>
  messages.map((message) => `• ${message}`).join("\n");

export const notifySimulationErrors = (...sources: ErrorSource[]): void => {
  const messages = normalizeMessages(sources);

  if (messages.length === 0) {
    return;
  }

  const isNote = messages.every(
    (message) => message.startsWith("Note:") || message.includes(": Note:")
  );
  const toastType = isNote ? "info" : "error";
  const toastTitle = isNote ? "Simulation Note" : "Simulation Error";

  const maxCollapsedItems = 2;
  const hasExtra = messages.length > maxCollapsedItems;

  const collapsedMessages = hasExtra
    ? messages.slice(0, maxCollapsedItems)
    : messages;

  const collapsedDescription = hasExtra
    ? `${formatBulletedList(collapsedMessages)}
(${messages.length - maxCollapsedItems} more ${isNote ? "note" : "error"}${
        messages.length - maxCollapsedItems === 1 ? "" : "s"
      })`
    : formatBulletedList(collapsedMessages);

  const expandedDescription = formatBulletedList(messages);

  let toastId = "";
  let isExpanded = false;

  const toggleDetails = () => {
    if (!toastId) {
      return;
    }

    isExpanded = !isExpanded;

    toaster.update(toastId, {
      description: isExpanded ? expandedDescription : collapsedDescription,
      action: hasExtra
        ? {
            label: isExpanded ? "Hide details" : "Show details",
            onClick: toggleDetails,
          }
        : undefined,
      duration: 10000,
      meta: { closable: true },
      type: toastType,
    });
  };

  toastId = toaster.create({
    title: toastTitle,
    description: collapsedDescription,
    type: toastType,
    duration: 10000,
    meta: { closable: true },
    action: hasExtra
      ? {
          label: "Show details",
          onClick: toggleDetails,
        }
      : undefined,
  });

  // Log to global message store
  const { addMessage } = useAppStore.getState();
  messages.forEach((msg) => {
    addMessage({
      text: msg,
      type: toastType === "info" ? "info" : "error",
      category: "Simulation",
      mLevel: "user",
    });
  });
};
