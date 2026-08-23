export interface ParsedSpiceLine {
  componentName: string;
  type: string;
  tokens: string[];
  nodes: string[];
  subcircuitName?: string;
  parameters: string[];
}

export function parseSpiceLine(line: string): ParsedSpiceLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("*") || trimmed.startsWith(".")) return null;
  const tokens = trimmed.split(/\s+/);
  const componentName = tokens[0];
  if (!componentName) return null;
  const type = componentName[0]!.toUpperCase();

  if (type !== "X") {
    const nodeCount = type === "R" || type === "L" || type === "C" || type === "V" || type === "I" || type === "D"
      ? 2
      : type === "Q" || type === "J" || type === "Z"
        ? 3
        : type === "M"
          ? 4
          : type === "E" || type === "G"
            ? 4
            : type === "F" || type === "H"
              ? 2
              : 2;
    return { componentName, type, tokens, nodes: tokens.slice(1, nodeCount + 1), parameters: tokens.slice(nodeCount + 1) };
  }

  const positional: string[] = [];
  const parameters: string[] = [];
  let inParameters = false;
  for (const token of tokens.slice(1)) {
    if (inParameters || token.toUpperCase() === "PARAMS:" || token.includes("=")) {
      inParameters = true;
      if (token.toUpperCase() !== "PARAMS:") parameters.push(token);
    } else {
      positional.push(token);
    }
  }
  const subcircuitName = positional.pop();
  return { componentName, type, tokens, nodes: positional, subcircuitName, parameters };
}

export function isSubcircuitStart(line: string): boolean {
  return /^\.subckt\b/i.test(line.trim());
}

export function isSubcircuitEnd(line: string): boolean {
  return /^\.ends?\b/i.test(line.trim());
}
