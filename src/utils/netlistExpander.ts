import { parseBracketOperation, type BracketOperation } from './bracketParser';

export interface ExpandedNetlist {
  netlist: string;
  parameterValue: string;
  parameterIndex: number;
}

export interface NetlistExpansionResult {
  hasExpansion: boolean;
  originalNetlist: string;
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
    
    // Generate expanded netlists by substituting each value
    console.log(`Expanding bracket operation [${bracketOperation.start}:${bracketOperation.step}:${bracketOperation.stop}] into ${values.length} values:`, values);
    
    const expandedNetlists: ExpandedNetlist[] = values.map((value, index) => {
      const expandedNetlist = netlist.replace(bracketOperation.originalText, value);
      
      return {
        netlist: expandedNetlist,
        parameterValue: value,
        parameterIndex: index
      };
    });
    
    return {
      hasExpansion: true,
      originalNetlist: netlist,
      expandedNetlists,
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
    const bracketRegex = /\[(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\s*:\s*(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\s*:\s*(-?\d+(?:\.\d+)?)(u|m|k|Meg|G|T|p|n|f|a)?\]\s*(u|m|k|Meg|G|T|p|n|f|a)?/g;
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
    
    if (analysis.estimatedExpansionCount > 1000) {
      return {
        canExpand: false,
        reason: `Bracket operation would generate ${analysis.estimatedExpansionCount} netlists, which exceeds the maximum limit of 1000`
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