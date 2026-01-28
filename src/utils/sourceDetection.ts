/**
 * Source Detection Utility for SPICE Netlists
 * 
 * Automatically detects voltage and current sources from SPICE netlists
 * for use in AC and DC simulation configuration dropdowns.
 */

/**
 * Extracts voltage and current sources from a SPICE netlist
 * 
 * @param netlist - The SPICE netlist string
 * @returns Array of source names (e.g., ['V1', 'Vin', 'I1', 'iin'])
 */
export function detectSourcesFromNetlist(netlist: string | undefined): string[] {
  if (!netlist || typeof netlist !== 'string') {
    return [];
  }

  const sources: Set<string> = new Set();
  const lines = netlist.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('*') || trimmedLine.startsWith('.')) {
      continue;
    }

    // Split line into components (space-separated)
    const parts = trimmedLine.split(/\s+/);
    if (parts.length === 0) {
      continue;
    }

    const componentName = parts[0];
    
    // Check if component starts with V or I (voltage/current source)
    // Support both uppercase and lowercase: V1, Vin, v1, vin, I1, Iin, i1, iin
    if (componentName && /^[VvIi]/.test(componentName)) {
      sources.add(componentName);
    }
  }

  // Convert to array and sort for consistent ordering
  return Array.from(sources).sort((a, b) => {
    // Sort by type first (V before I), then alphabetically
    const aType = a.charAt(0).toUpperCase();
    const bType = b.charAt(0).toUpperCase();
    
    if (aType !== bType) {
      return aType === 'V' ? -1 : 1;
    }
    
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}



/**
 * Validates if a source exists in the given netlist
 * 
 * @param netlist - The SPICE netlist string
 * @param sourceName - The source name to validate
 * @returns True if the source exists in the netlist
 */
export function validateSourceInNetlist(netlist: string | undefined, sourceName: string): boolean {
  if (!sourceName || !netlist) {
    return false;
  }

  const detectedSources = detectSourcesFromNetlist(netlist);
  return detectedSources.includes(sourceName);
}

/**
 * Gets a default source from the netlist (first voltage source, or first source if no voltage sources)
 * 
 * @param netlist - The SPICE netlist string
 * @returns Default source name or empty string if none found
 */
export function getDefaultSource(netlist: string | undefined): string {
  if (!netlist) {
    return '';
  }
  
  const sources = detectSourcesFromNetlist(netlist);
  
  if (sources.length === 0) {
    return '';
  }

  // Prefer voltage sources (V/v) over current sources (I/i)
  const voltageSource = sources.find(source => /^[Vv]/.test(source));
  return voltageSource || sources[0] || '';
}

/**
 * Adds "AC 1" parameter to a specific source in the netlist for AC analysis
 * 
 * @param netlist - The SPICE netlist string
 * @param sourceName - The specific source to modify (e.g., "Vin", "V1")
 * @returns Modified netlist with "AC 1" added to the specified source
 */
export function addAcParameterToSource(netlist: string | undefined, sourceName: string): string {
  if (!netlist || typeof netlist !== 'string' || !sourceName) {
    return netlist || '';
  }

  const lines = netlist.split('\n');
  const modifiedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('*') || trimmedLine.startsWith('.')) {
      return line;
    }

    // Split line into components (space-separated)
    const parts = trimmedLine.split(/\s+/);
    if (parts.length === 0) {
      return line;
    }

    const componentName = parts[0];
    
    // Only modify the specified source
    if (componentName && componentName.toLowerCase() === sourceName.toLowerCase()) {
      // Check if AC parameter already exists (case-insensitive)
      const hasAcParam = parts.some(part => part.toLowerCase() === 'ac');
      
      if (!hasAcParam) {
        // Preserve original indentation by finding the start of content
        const originalIndent = line.substring(0, line.indexOf(trimmedLine));
        const newLine = originalIndent + trimmedLine + ' AC 1';
        return newLine;
      }
    }

    return line;
  });

  return modifiedLines.join('\n');
}