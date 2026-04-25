export const extractValidNetsAndComponents = (
  netlist: string
): { nets: Set<string>; components: Set<string> } => {
  const nets = new Set<string>();
  const components = new Set<string>();

  const lines = netlist.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("*") || line.startsWith(".")) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const token0 = tokens[0];
    if (!token0) continue;
    const compName = token0.toUpperCase();
    components.add(compName);

    const firstChar = compName.length > 0 ? compName[0] : "";
    let numNodes: number;

    if (firstChar && ["R", "L", "C", "V", "I", "D"].includes(firstChar)) {
      numNodes = 2;
    } else if (firstChar && ["Q", "J"].includes(firstChar)) {
      numNodes = 3; 
    } else if (firstChar === "M") {
      numNodes = 4;
    } else if (firstChar && ["E", "G"].includes(firstChar)) {
      numNodes = 4; // Voltage/VCCS have 4 nodes
    } else if (firstChar && ["F", "H"].includes(firstChar)) {
      numNodes = 2; // CCCS/CCVS have 2 nodes + 1 vsource name
    } else if (firstChar === "X") {
      numNodes = tokens.length - 2; // Everything except Xname and subcktName
    } else {
      numNodes = 2; // safely assume at least 2
    }

    // Special case for subcircuits: just add everything between the instance name and the subckt name
    if (firstChar === "X") {
      for (let i = 1; i < tokens.length - 1; i++) {
        if (tokens[i]) {
          nets.add(tokens[i] as string);
        }
      }
    } else {
      for (let i = 1; i <= numNodes && i < tokens.length; i++) {
        if (tokens[i]) {
          nets.add(tokens[i] as string);
        }
      }
    }
  }

  // Always consider 0 as a valid net
  nets.add("0");

  return { nets, components };
};
