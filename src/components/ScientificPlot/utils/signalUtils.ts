/**
 * Determines if a signal name corresponds to an internal subcircuit signal.
 * Internal signals usually have names like `x1.i`, `x1.i.b`, `m.x1.m3.body`.
 * Subcircuits always start with x or X, followed by the component name.
 * 
 * @param variableName The name of the signal/variable
 * @returns true if the signal is internal to a subcircuit
 */
export const isInternalSignal = (variableName: string): boolean => {
  // Regex looks for:
  // 1. A segment starting with 'x' (case insensitive)
  // 2. Preceded by start of string, '(', or '.'
  // 3. Followed by a dot '.' (indicating it has children/is a subcircuit parent)
  return /(?:^|[.(])x[^.]*\./i.test(variableName);
};
