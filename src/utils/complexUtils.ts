import { ComplexNumber, ResultType } from "eecircuit-engine";

export interface PolarCoordinates {
  magnitude: number;
  phase: number; // in radians
}

/**
 * Convert a complex number to polar coordinates (magnitude and phase)
 */
export function complexToPolar(complex: ComplexNumber): PolarCoordinates {
  const magnitude = Math.sqrt(complex.real ** 2 + complex.img ** 2);
  const phase = Math.atan2(complex.img, complex.real);
  return { magnitude, phase };
}

/**
 * Convert phase from radians to degrees
 */
export function radiansToDegrees(phaseRadians: number): number {
  return (phaseRadians * 180) / Math.PI;
}

/**
 * Process complex data arrays into separate magnitude and phase arrays
 */
export function processComplexArray(
  complexValues: (number | ComplexNumber)[],
  convertPhaseToDegrees: boolean = true
): { magnitudes: number[]; phases: number[] } {
  const magnitudes: number[] = [];
  const phases: number[] = [];

  for (const value of complexValues) {
    if (typeof value === 'number') {
      // Real number - magnitude is the value, phase is 0
      magnitudes.push(Math.abs(value));
      phases.push(value >= 0 ? 0 : (convertPhaseToDegrees ? 180 : Math.PI));
    } else {
      // Complex number - convert to polar
      const polar = complexToPolar(value);
      magnitudes.push(polar.magnitude);
      phases.push(convertPhaseToDegrees ? radiansToDegrees(polar.phase) : polar.phase);
    }
  }

  return { magnitudes, phases };
}

/**
 * Check if data type indicates complex numbers
 */
export function isComplexDataType(dataType: string): boolean {
  return dataType.toLowerCase() === 'complex';
}

/**
 * Transform a single ResultType to handle complex data by expanding variables
 * Each complex variable becomes 2 data elements: magnitude and phase
 */
export function transformResultForComplexData(result: ResultType): ResultType {
  if (!isComplexDataType(result.dataType)) {
    return result;
  }



  // For complex data, create expanded data array
  // Define local type matching RealDataType from eecircuit-engine
  type ExpandedData = {
    values: number[];
    name: string;
    type: "voltage" | "current" | "time" | "frequency" | "notype";
  };
  const transformedData: ExpandedData[] = [];
  const expandedVariableNames: string[] = [];

  // First, handle frequency data (index 0) - extract real part
  const frequencyData = result.data[0];
  if (frequencyData) {
    const frequencyValues = (frequencyData.values as ComplexNumber[]).map(v => v.real);
    transformedData.push({
      values: frequencyValues,
      name: frequencyData.name,
      type: (frequencyData.type as ExpandedData['type']) || 'frequency'
    });
    expandedVariableNames.push(frequencyData.name);
    
  }

  // Then handle voltage/current data (indices 1+) - expand to magnitude and phase
  for (let i = 1; i < result.data.length; i++) {
    const dataElement = result.data[i];
    if (!dataElement) continue;

    const complexValues = dataElement.values as ComplexNumber[];
    const { magnitudes, phases } = processComplexArray(complexValues);

    // Add magnitude data
    transformedData.push({
      values: magnitudes,
      name: `${dataElement.name}[mag]`,
      type: (dataElement.type as ExpandedData['type']) || 'voltage'
    });
    expandedVariableNames.push(`${dataElement.name}[mag]`);

    // Add phase data
    transformedData.push({
      values: phases,
      name: `${dataElement.name}[phase]`,
      type: (dataElement.type as ExpandedData['type']) || 'voltage'
    });
    expandedVariableNames.push(`${dataElement.name}[phase]`);

  }


  // Return transformed result
  return {
    ...result,
    variableNames: expandedVariableNames,
    numVariables: expandedVariableNames.length,
    numPoints: transformedData[0]?.values?.length || 0,
    data: transformedData,
    dataType: 'real'
  } as ResultType;
}