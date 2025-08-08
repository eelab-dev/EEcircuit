export interface BracketOperation {
  start: number;
  step: number;
  stop: number;
  unit?: string;
  originalText: string;
  position: number; // Character position in the netlist
}

export interface ParseResult {
  hasBracketOperation: boolean;
  bracketOperation?: BracketOperation;
  values?: string[];
}

/**
 * Regular expression to match bracket operations like [a:b:c] with optional units
 * Supports:
 * - [0:2:10]u
 * - [0u:2u:10u] 
 * - [0.1:0.2:1]
 * - Numbers can be integers or floats
 */
const BRACKET_REGEX = /\[(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\s*:\s*(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\s*:\s*(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\]\s*(u|m|k|Meg|G|T|p|n|f|a)?/;

/**
 * Parse a number with optional unit suffix
 */
function parseNumberWithUnit(value: string, unit?: string): { number: number; unit?: string } {
  const num = parseFloat(value);
  return { number: num, unit };
}

/**
 * Generate values array from start, step, stop parameters
 */
function generateValues(start: number, step: number, stop: number): number[] {
  const values: number[] = [];
  
  if (step === 0) {
    throw new Error("Step size cannot be zero");
  }
  
  if (step > 0) {
    // Forward iteration
    for (let value = start; value <= stop; value += step) {
      values.push(value);
    }
  } else {
    // Backward iteration
    for (let value = start; value >= stop; value += step) {
      values.push(value);
    }
  }
  
  return values;
}

/**
 * Format a value with optional unit
 */
function formatValue(value: number, unit?: string): string {
  const formattedNumber = value.toString();
  return unit ? `${formattedNumber}${unit}` : formattedNumber;
}

/**
 * Find the first bracket operation in a netlist
 * Returns null if no bracket operation is found
 */
export function findFirstBracketOperation(netlist: string): BracketOperation | null {
  const match = netlist.match(BRACKET_REGEX);
  
  if (!match) {
    return null;
  }
  
  const [fullMatch, startStr, startUnit, stepStr, stepUnit, stopStr, stopUnit, externalUnit] = match;
  
  // Determine the unit to use (external unit takes precedence)
  const finalUnit = externalUnit || startUnit || stepUnit || stopUnit;
  
  const start = parseFloat(startStr!);
  const step = parseFloat(stepStr!);
  const stop = parseFloat(stopStr!);
  
  if (isNaN(start) || isNaN(step) || isNaN(stop)) {
    throw new Error(`Invalid bracket operation: ${fullMatch}. All values must be valid numbers.`);
  }
  
  return {
    start,
    step,
    stop,
    unit: finalUnit,
    originalText: fullMatch,
    position: match.index!
  };
}

/**
 * Parse bracket operation and generate values array
 */
export function parseBracketOperation(netlist: string): ParseResult {
  try {
    const bracketOp = findFirstBracketOperation(netlist);
    
    if (!bracketOp) {
      return { hasBracketOperation: false };
    }
    
    const numericValues = generateValues(bracketOp.start, bracketOp.step, bracketOp.stop);
    const values = numericValues.map(value => formatValue(value, bracketOp.unit));
    
    return {
      hasBracketOperation: true,
      bracketOperation: bracketOp,
      values
    };
  } catch (error) {
    throw new Error(`Failed to parse bracket operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate bracket operation syntax
 */
export function validateBracketOperation(netlist: string): { isValid: boolean; error?: string } {
  try {
    const result = parseBracketOperation(netlist);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}