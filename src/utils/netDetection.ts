/**
 * Net Detection Utility for SPICE Netlists
 * 
 * Automatically detects nodes/nets from SPICE netlists
 * for use in simulation configuration dropdowns.
 */

/**
 * Extracts unique net names from a SPICE netlist
 * 
 * @param netlist - The SPICE netlist string
 * @returns Array of unique net names sorted alphanumerically
 */
export function detectNetsFromNetlist(netlist: string | undefined): string[] {
  if (!netlist || typeof netlist !== 'string') {
    return [];
  }

  const nets: Set<string> = new Set();
  const lines = netlist.split('\n');

  let inSubckt = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for subcircuit start/end
    if (trimmedLine.toLowerCase().startsWith('.subckt')) {
      inSubckt = true;
      continue;
    }
    if (trimmedLine.toLowerCase().startsWith('.ends')) {
      inSubckt = false;
      continue;
    }

    // Skip if we are inside a subcircuit definition
    if (inSubckt) {
      continue;
    }

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('*') || trimmedLine.startsWith('.')) {
      continue;
    }

    // Split line into components (space-separated)
    const parts = trimmedLine.split(/\s+/);
    if (parts.length < 2) {
      continue;
    }

    const componentName = parts[0]!.toUpperCase();
    const type = componentName.charAt(0);

    // Helper to add nodes
    const addNodes = (indices: number[]) => {
      indices.forEach(index => {
        if (index < parts.length && parts[index]) {
          // Normalize 0 to '0' (ground)
          nets.add(parts[index]!);
        }
      });
    };

    // Extract nodes based on component type
    // Basic passives and sources: Name Node1 Node2 ...
    if (['R', 'C', 'L', 'D', 'V', 'I'].includes(type)) {
      addNodes([1, 2]);
    }
    // BJT, JFET, MESFET: Name C B E [S] ...
    else if (['Q', 'J', 'Z'].includes(type)) {
      addNodes([1, 2, 3]);
       // Optional 4th node for substrate/body, but often model starts there.
       // Keep it simple: first 3 are definitely nodes.
    }
    // MOSFET: Name D G S B ...
    else if (['M'].includes(type)) {
      addNodes([1, 2, 3, 4]);
    }
    // Controlled Sources (E, F, G, H): Name N+ N- ...
    else if (['E', 'F', 'G', 'H'].includes(type)) {
      addNodes([1, 2]); // Output nodes
      // Input nodes vary by type (voltage vs current controlled)
      // E, G: Name N+ N- NC+ NC- ...
      if (['E', 'G'].includes(type)) {
          addNodes([3, 4]);
      }
    }
    // Switches (S, W): Name N+ N- NC+ NC- ...
    else if (['S', 'W'].includes(type)) {
      addNodes([1, 2, 3, 4]);
    }
    // Subcircuits: Xname N1 N2 ... ModelName [Params]
    else if (type === 'X') {
      if (parts.length > 2) {
        // Find the model name index.
        // It's typically the last non-parameter token.
        // Parameters usually have '=' or are strictly key-value pairs.
        // Simplified heuristic: Take tokens starting from index 1.
        // Filter out tokens containing '='.
        // The *last* remaining token is likely the ModelName.
        // All previous remaining tokens are nodes.
        
        const possibleNodesAndModel = parts.slice(1).filter(p => !p.includes('='));
        
        // If we have at least 2 items (Node + Model), the last one is Model.
        if (possibleNodesAndModel.length > 1) {
            const nodes = possibleNodesAndModel.slice(0, -1);
            nodes.forEach(n => nets.add(n));
        }
      }
    }
  }

  // Convert to array and sort
  return Array.from(nets).sort((a, b) => {
    // Put '0' (ground) first
    if (a === '0') return -1;
    if (b === '0') return 1;

    // Sort numerically if possible, else alphabetically
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}
