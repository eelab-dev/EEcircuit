import { ToBePlotted } from "../types/commonTypes";

export const formatToBePlottedLabel = (item: ToBePlotted): string => {
  if (item.type === "voltage") {
    return `V(${item.netName})`;
  }

  return `I(${item.componentName},${item.terminalName})`;
};

export const areToBePlottedItemsEqual = (
  a: ToBePlotted,
  b: ToBePlotted
): boolean => {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "voltage" && b.type === "voltage") {
    return a.netName === b.netName;
  }

  if (a.type === "current" && b.type === "current") {
    return (
      a.componentName === b.componentName &&
      a.terminalName === b.terminalName
    );
  }

  return false;
};

export const buildToBePlottedCommands = (items: ToBePlotted[]): string => {
  if (items.length === 0) {
    return "";
  }

  const voltageTokens: string[] = [];
  const probeCommands: string[] = [];

  items.forEach((item) => {
    if (item.type === "voltage") {
      voltageTokens.push(`V(${item.netName})`);
    } else {
      probeCommands.push(`.probe I(${item.componentName},${item.terminalName})`);
    }
  });

  const commands: string[] = [];

  if (voltageTokens.length > 0) {
    commands.push(`.save ${voltageTokens.join(" ")}`);
  }

  if (probeCommands.length > 0) {
    commands.push(...probeCommands);
  }

  return commands.join("\n");
};

export const parseTerminalPointerInfo = (
  pointerName: string | null | undefined
): { componentName: string; terminalName: string } | null => {
  if (!pointerName) {
    return null;
  }

  const match = pointerName.match(/^\s*(.*?)\s*\(\s*(.*?)\s*\)\s*$/);
  if (!match) {
    return null;
  }

  const componentName = match[1]?.trim();
  const terminalName = match[2]?.trim();

  if (!componentName || !terminalName) {
    return null;
  }

  return { componentName, terminalName };
};

export const normalizeTerminalSelection = (
  selection: { componentName: string; terminalName: string }
): { componentName: string; terminalName: string } => {
  const componentName = selection.componentName?.trim();
  const terminalName = selection.terminalName?.trim();

  if (!componentName || !terminalName) {
    return selection;
  }

  const isSpiceSource = /^[vi]/i.test(componentName);

  if (isSpiceSource) {
    const lowerTerminal = terminalName.toLowerCase();

    if (lowerTerminal === "pos") {
      // ngspice .probe interprets source pins as n1/n2 instead of pos/neg
      return { componentName, terminalName: "1" };
    }

    if (lowerTerminal === "neg") {
      // ngspice .probe interprets source pins as n1/n2 instead of pos/neg
      return { componentName, terminalName: "2" };
    }
  }

  return { componentName, terminalName };
};
