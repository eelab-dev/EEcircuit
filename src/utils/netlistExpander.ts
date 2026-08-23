import { parseBracketOperation, BRACKET_REGEX, type BracketOperation } from './bracketParser';

export interface ExpandedNetlist {
  netlist: string;
  parameterValue: string;
  parameterIndex: number;
}

export interface NetlistExpansionResult {
  hasExpansion: boolean;
  originalNetlist: string;
  /** Values are retained; complete substituted netlists are created on demand. */
  parameterValues?: string[];
  expandAt?: (parameterIndex: number) => ExpandedNetlist;
  /** @deprecated Use parameterValues and expandAt to avoid retaining full netlists. */
  expandedNetlists?: ExpandedNetlist[];
  bracketOperation?: BracketOperation;
  error?: string;
}

/**
 * Expand a netlist containing bracket operations into multiple netlists
 * Only processes the first bracket operation found in the netlist
 */
export function expandNetlist(netlist: string): NetlistExpansionResult {
  try {
    const parseResult = parseBracketOperation(netlist);
    
    if (!parseResult.hasBracketOperation || !parseResult.bracketOperation || !parseResult.values) {
      return {
        hasExpansion: false,
        originalNetlist: netlist
      };
    }
    
    const { bracketOperation, values } = parseResult;
    
    return {
      hasExpansion: true,
      originalNetlist: netlist,
      parameterValues: values,
      expandAt: (parameterIndex) => {
        const parameterValue = values[parameterIndex];
        if (parameterValue === undefined) {
          throw new Error(`Invalid bracket parameter index: ${parameterIndex}`);
        }
        return {
          netlist: netlist.replace(bracketOperation.originalText, parameterValue),
          parameterValue,
          parameterIndex,
        };
      },
      bracketOperation
    };
  } catch (error) {
    return {
      hasExpansion: false,
      originalNetlist: netlist,
      error: error instanceof Error ? error.message : 'Unknown error during netlist expansion'
    };
  }
}

/**
 * Get information about bracket operations in a netlist without expanding
 */
export function analyzeBracketOperations(netlist: string): {
  hasBracketOperations: boolean;
  firstBracketOperation?: BracketOperation;
  totalBracketOperations: number;
  estimatedExpansionCount?: number;
} {
  try {
    // Count all bracket operations in the netlist
    // Use the shared bracket regex pattern with a global flag for counting
    const bracketRegex = new RegExp(BRACKET_REGEX.source, 'g');
    const matches = Array.from(netlist.matchAll(bracketRegex));
    const totalBracketOperations = matches.length;
    
    if (totalBracketOperations === 0) {
      return {
        hasBracketOperations: false,
        totalBracketOperations: 0
      };
    }
    
    // Parse the first bracket operation to get expansion info
    const parseResult = parseBracketOperation(netlist);
    
    return {
      hasBracketOperations: true,
      firstBracketOperation: parseResult.bracketOperation,
      totalBracketOperations,
      estimatedExpansionCount: parseResult.values?.length || 0
    };
  } catch {
    return {
      hasBracketOperations: false,
      totalBracketOperations: 0
    };
  }
}

/**
 * Validate that a netlist can be expanded (has valid bracket operations)
 */
export function canExpandNetlist(netlist: string): { canExpand: boolean; reason?: string } {
  try {
    const analysis = analyzeBracketOperations(netlist);
    
    if (!analysis.hasBracketOperations) {
      return {
        canExpand: false,
        reason: 'No bracket operations found in netlist'
      };
    }
    
    if (!analysis.estimatedExpansionCount || analysis.estimatedExpansionCount === 0) {
      return {
        canExpand: false,
        reason: 'Bracket operation would generate zero netlists'
      };
    }
    
    return { canExpand: true };
  } catch (error) {
    return {
      canExpand: false,
      reason: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}
