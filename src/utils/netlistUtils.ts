import { isSubcircuitEnd, isSubcircuitStart, parseSpiceLine } from "./spiceLineParser";

export const extractValidNetsAndComponents = (
  netlist: string
): { nets: Set<string>; components: Set<string> } => {
  const nets = new Set<string>();
  const components = new Set<string>();
  let inSubcircuit = false;

  for (const line of netlist.split("\n")) {
    if (isSubcircuitStart(line)) { inSubcircuit = true; continue; }
    if (isSubcircuitEnd(line)) { inSubcircuit = false; continue; }
    if (inSubcircuit) continue;
    const parsed = parseSpiceLine(line);
    if (!parsed) continue;
    components.add(parsed.componentName.toUpperCase());
    parsed.nodes.forEach((node) => nets.add(node));
  }

  nets.add("0");
  return { nets, components };
};
