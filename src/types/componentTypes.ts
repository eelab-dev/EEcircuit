// Component property type definitions for EEsim
import type { AvailableComponent, SelectedItem } from "eecircuit-schematic";

export interface BaseComponentProperties {
  name: string;
}

export interface ResistorProperties extends BaseComponentProperties {
  value: string; // e.g., "1k", "10ohm"
}

export interface CapacitorProperties extends BaseComponentProperties {
  value: string; // e.g., "10uF", "100pF"
  ic?: string; // Initial condition
}

export interface InductorProperties extends BaseComponentProperties {
  value: string; // e.g., "1mH", "10uH"
  ic?: string; // Initial condition
}

export interface VoltageSourceProperties extends BaseComponentProperties {
  value: string; // e.g., "5V", "1.8V"
  dcValue?: string; // DC analysis value
  type?: "dc" | "ac" | "pulse" | "sin"; // Source type
  // SIN parameters: (offset_voltage amplitude frequency delay damping_factor phase)
  offset?: string; // Offset voltage
  amplitude?: string; // Amplitude
  frequency?: string; // Frequency
  delay?: string; // Time delay
  damping?: string; // Damping factor
  phase?: string; // Phase
  // PULSE parameters: (v1 v2 time_delay rise_time fall_time width period)
  v1?: string; // Initial value
  v2?: string; // Pulsed value
  timeDelay?: string; // Time delay
  riseTime?: string; // Rise time
  fallTime?: string; // Fall time
  width?: string; // Pulse width
  period?: string; // Period
}

export interface CurrentSourceProperties extends BaseComponentProperties {
  value: string; // e.g., "1mA", "10uA"
  dcValue?: string; // DC analysis value
  type?: "dc" | "ac" | "pulse" | "sin"; // Source type
  // SIN parameters: (offset_current amplitude frequency delay damping_factor phase)
  offset?: string; // Offset current
  amplitude?: string; // Amplitude
  frequency?: string; // Frequency
  delay?: string; // Time delay
  damping?: string; // Damping factor
  phase?: string; // Phase
  // PULSE parameters: (i1 i2 time_delay rise_time fall_time width period)
  i1?: string; // Initial value
  i2?: string; // Pulsed value
  timeDelay?: string; // Time delay
  riseTime?: string; // Rise time
  fallTime?: string; // Fall time
  width?: string; // Pulse width
  period?: string; // Period
}

export interface FETProperties extends BaseComponentProperties {
  model: string; // Model name - required
  W: string; // Width e.g., "10u"
  L: string; // Length e.g., "0.18u"
  m?: string; // Multiplier
  ad?: string; // Drain area
  as?: string; // Source area
  pd?: string; // Drain perimeter
  ps?: string; // Source perimeter
  nrd?: string; // Number of squares in drain
  nrs?: string; // Number of squares in source
  temp?: string; // Temperature
}

export interface OpampProperties extends BaseComponentProperties {
  model: string;
}

// Type aliases for backward compatibility
export type NFETProperties = FETProperties;
export type PFETProperties = FETProperties;

export interface PowerNodeProperties extends BaseComponentProperties {
  value?: string; // e.g., "1.8V", "0V" - optional for VDD/GND
}

export interface PortProperties extends BaseComponentProperties {
  portType?: "input" | "output" | "inout";
  netName: string; // Net name for the port
}

// Union type for all component properties
export type ComponentProperties =
  | ResistorProperties
  | CapacitorProperties
  | InductorProperties
  | VoltageSourceProperties
  | CurrentSourceProperties
  | FETProperties
  | OpampProperties
  | PowerNodeProperties
  | PortProperties;

// Component type mapping - using the type from the schematic library
export type ComponentType = AvailableComponent["type"];

// Property field definition for dynamic form generation
export interface PropertyField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select type
  unit?: string;
}

// Shared FET property configuration
const baseFETConfig: PropertyField[] = [
  {
    key: "model",
    label: "Model",
    type: "text",
    placeholder: "e.g., nch, pch",
    required: true,
  },
  {
    key: "W",
    label: "Width",
    type: "text",
    placeholder: "e.g., 10u, 1m",
    required: true,
    unit: "m",
  },
  {
    key: "L",
    label: "Length",
    type: "text",
    placeholder: "e.g., 0.18u, 180n",
    required: true,
    unit: "m",
  },
  {
    key: "m",
    label: "Multiplier",
    type: "text",
    placeholder: "e.g., 1, 2",
    required: false,
  },
  {
    key: "ad",
    label: "Drain Area",
    type: "text",
    placeholder: "e.g., 10p",
    required: false,
    unit: "m²",
  },
  {
    key: "as",
    label: "Source Area",
    type: "text",
    placeholder: "e.g., 10p",
    required: false,
    unit: "m²",
  },
];

// Component property configuration
export const componentPropertyConfigs: Record<ComponentType, PropertyField[]> =
  {
    resistor: [
      {
        key: "value",
        label: "Resistance",
        type: "text",
        placeholder: "e.g., 1k, 10ohm, 100",
        required: true,
        unit: "Ω",
      },
    ],
    capacitor: [
      {
        key: "value",
        label: "Capacitance",
        type: "text",
        placeholder: "e.g., 10uF, 100pF, 1n",
        required: true,
        unit: "F",
      },
      {
        key: "ic",
        label: "Initial Condition",
        type: "text",
        placeholder: "e.g., 0V, 1.8V",
        required: false,
        unit: "V",
      },
    ],
    inductor: [
      {
        key: "value",
        label: "Inductance",
        type: "text",
        placeholder: "e.g., 1mH, 10uH, 100n",
        required: true,
        unit: "H",
      },
      {
        key: "ic",
        label: "Initial Condition",
        type: "text",
        placeholder: "e.g., 0A, 1mA",
        required: false,
        unit: "A",
      },
    ],
    vdc: [
      {
        key: "value",
        label: "DC Voltage",
        type: "text",
        placeholder: "e.g., 5V, 1.8V, 3.3",
        required: true,
        unit: "V",
      },
    ],
    idc: [
      {
        key: "value",
        label: "DC Current",
        type: "text",
        placeholder: "e.g., 1mA, 10uA, 1A",
        required: true,
        unit: "A",
      },
    ],
    vsin: [
      {
        key: "dcValue",
        label: "DC Value",
        type: "text",
        placeholder: "e.g., 0V, 1.2V",
        required: false,
        unit: "V",
      },
      {
        key: "offset",
        label: "Offset Voltage",
        type: "text",
        placeholder: "e.g., 0V, 2.5V",
        required: false,
        unit: "V",
      },
      {
        key: "amplitude",
        label: "Amplitude",
        type: "text",
        placeholder: "e.g., 1V, 500mV",
        required: true,
        unit: "V",
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "text",
        placeholder: "e.g., 1kHz, 50Hz",
        required: true,
        unit: "Hz",
      },
      {
        key: "delay",
        label: "Delay",
        type: "text",
        placeholder: "e.g., 0s, 1ms",
        required: false,
        unit: "s",
      },
      {
        key: "damping",
        label: "Damping Factor",
        type: "text",
        placeholder: "e.g., 0, 0.1",
        required: false,
      },
      {
        key: "phase",
        label: "Phase",
        type: "text",
        placeholder: "e.g., 0°, 90°",
        required: false,
        unit: "°",
      },
    ],
    vpulse: [
      {
        key: "dcValue",
        label: "DC Value",
        type: "text",
        placeholder: "e.g., 0V, 1.2V",
        required: false,
        unit: "V",
      },
      {
        key: "v1",
        label: "Initial Value (V1)",
        type: "text",
        placeholder: "e.g., 0V, -5V",
        required: true,
        unit: "V",
      },
      {
        key: "v2",
        label: "Pulsed Value (V2)",
        type: "text",
        placeholder: "e.g., 5V, 3.3V",
        required: true,
        unit: "V",
      },
      {
        key: "timeDelay",
        label: "Time Delay",
        type: "text",
        placeholder: "e.g., 0s, 1ns",
        required: false,
        unit: "s",
      },
      {
        key: "riseTime",
        label: "Rise Time",
        type: "text",
        placeholder: "e.g., 1ns, 10ps",
        required: false,
        unit: "s",
      },
      {
        key: "fallTime",
        label: "Fall Time",
        type: "text",
        placeholder: "e.g., 1ns, 10ps",
        required: false,
        unit: "s",
      },
      {
        key: "width",
        label: "Pulse Width",
        type: "text",
        placeholder: "e.g., 10ns, 1us",
        required: true,
        unit: "s",
      },
      {
        key: "period",
        label: "Period",
        type: "text",
        placeholder: "e.g., 20ns, 2us",
        required: true,
        unit: "s",
      },
    ],
    isin: [
      {
        key: "dcValue",
        label: "DC Value",
        type: "text",
        placeholder: "e.g., 0A, 1mA",
        required: false,
        unit: "A",
      },
      {
        key: "offset",
        label: "Offset Current",
        type: "text",
        placeholder: "e.g., 0A, 1mA",
        required: false,
        unit: "A",
      },
      {
        key: "amplitude",
        label: "Amplitude",
        type: "text",
        placeholder: "e.g., 1mA, 500uA",
        required: true,
        unit: "A",
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "text",
        placeholder: "e.g., 1kHz, 50Hz",
        required: true,
        unit: "Hz",
      },
      {
        key: "delay",
        label: "Delay",
        type: "text",
        placeholder: "e.g., 0s, 1ms",
        required: false,
        unit: "s",
      },
      {
        key: "damping",
        label: "Damping Factor",
        type: "text",
        placeholder: "e.g., 0, 0.1",
        required: false,
      },
      {
        key: "phase",
        label: "Phase",
        type: "text",
        placeholder: "e.g., 0°, 90°",
        required: false,
        unit: "°",
      },
    ],
    ipulse: [
      {
        key: "dcValue",
        label: "DC Value",
        type: "text",
        placeholder: "e.g., 0A, 1mA",
        required: false,
        unit: "A",
      },
      {
        key: "i1",
        label: "Initial Value (I1)",
        type: "text",
        placeholder: "e.g., 0A, -1mA",
        required: true,
        unit: "A",
      },
      {
        key: "i2",
        label: "Pulsed Value (I2)",
        type: "text",
        placeholder: "e.g., 1mA, 500uA",
        required: true,
        unit: "A",
      },
      {
        key: "timeDelay",
        label: "Time Delay",
        type: "text",
        placeholder: "e.g., 0s, 1ns",
        required: false,
        unit: "s",
      },
      {
        key: "riseTime",
        label: "Rise Time",
        type: "text",
        placeholder: "e.g., 1ns, 10ps",
        required: false,
        unit: "s",
      },
      {
        key: "fallTime",
        label: "Fall Time",
        type: "text",
        placeholder: "e.g., 1ns, 10ps",
        required: false,
        unit: "s",
      },
      {
        key: "width",
        label: "Pulse Width",
        type: "text",
        placeholder: "e.g., 10ns, 1us",
        required: true,
        unit: "s",
      },
      {
        key: "period",
        label: "Period",
        type: "text",
        placeholder: "e.g., 20ns, 2us",
        required: true,
        unit: "s",
      },
    ],
    VCVS: [
      {
        key: "value",
        label: "Voltage Gain",
        type: "text",
        placeholder: "e.g., 10, 0.5",
        required: true,
        unit: "V/V",
      },
    ],
    VCCS: [
      {
        key: "value",
        label: "Transconductance",
        type: "text",
        placeholder: "e.g., 1m, 100u",
        required: true,
        unit: "S",
      },
    ],
    CCVS: [
      {
        key: "value",
        label: "Transresistance",
        type: "text",
        placeholder: "e.g., 1k, 100",
        required: true,
        unit: "Ω",
      },
    ],
    CCCS: [
      {
        key: "value",
        label: "Current Gain",
        type: "text",
        placeholder: "e.g., 10, 0.5",
        required: true,
        unit: "A/A",
      },
    ],
    nFET: baseFETConfig,
    pFET: baseFETConfig,
    VDD: [],
    GND: [],
    port: [
      {
        key: "netName",
        label: "Net Name",
        type: "text",
        placeholder: "e.g., clk, data, reset",
        required: true,
      },
    ],
    OPAMP90: [
      {
        key: "model",
        label: "Model",
        type: "select",
        required: true,
      },
    ],
  };

// Extended types for property management
export type ExtendedSelectedItem = SelectedItem & {
  // Additional properties for enhanced component handling
  parsedProperties?: Partial<ComponentProperties>;
};

// Helper type to ensure type safety when working with component instances
export type ComponentInstanceWithProperties = Extract<
  SelectedItem,
  { type: "instance" }
> & {
  typeName: ComponentType;
};

// Helper function to get component property config with type safety
export function getComponentPropertyConfig(
  componentType: ComponentType
): PropertyField[] {
  return componentPropertyConfigs[componentType] || [];
}

// Helper function to check if a component type is valid
export function isValidComponentType(type: string): type is ComponentType {
  return type in componentPropertyConfigs;
}

// Helper function to parse component properties from a value string with type safety
export function parseComponentProperties(
  componentType: ComponentType,
  valueString: string
): Partial<ComponentProperties> {
  const config = getComponentPropertyConfig(componentType);
  const properties: Record<string, string> = {};

  // For simple components with just a value
  if (config.length === 1 && config[0]!.key === "value") {
    properties.value = valueString;
    return properties;
  }

  // For SIN sources, parse format: "SIN(offset amplitude frequency delay damping phase)"
  // Also handle optional partial DC param like "DC 1.2 SIN(...)"
  if (componentType === "vsin" || componentType === "isin") {
    // Check for DC parameter first
    const dcMatch = valueString.match(/DC\s+([^\s]+)/i);
    if (dcMatch && dcMatch[1]) {
      properties.dcValue = dcMatch[1];
    }

    const sinMatch = valueString.match(/SIN\s*\(\s*([^)]+)\s*\)/i);
    if (sinMatch) {
      const params = sinMatch[1]!.split(/\s+/);
      const keys = [
        "offset",
        "amplitude",
        "frequency",
        "delay",
        "damping",
        "phase",
      ];

      params.forEach((param, index) => {
        if (param.trim() && index < keys.length) {
          properties[keys[index]!] = param.trim();
        }
      });
      return properties;
    }
    // Fallback to default value parsing if not in SIN format
    properties.value = valueString;
    return properties;
  }

  // For PULSE sources, parse format: "PULSE(v1 v2 time_delay rise_time fall_time width period)"
  // Also handle optional partial DC param like "DC 1.2 PULSE(...)"
  if (componentType === "vpulse" || componentType === "ipulse") {
    // Check for DC parameter first
    const dcMatch = valueString.match(/DC\s+([^\s]+)/i);
    if (dcMatch && dcMatch[1]) {
      properties.dcValue = dcMatch[1];
    }

    const pulseMatch = valueString.match(/PULSE\s*\(\s*([^)]+)\s*\)/i);
    if (pulseMatch) {
      const params = pulseMatch[1]!.split(/\s+/);
      const keys =
        componentType === "vpulse"
          ? ["v1", "v2", "timeDelay", "riseTime", "fallTime", "width", "period"]
          : [
              "i1",
              "i2",
              "timeDelay",
              "riseTime",
              "fallTime",
              "width",
              "period",
            ];

      params.forEach((param, index) => {
        if (param.trim() && index < keys.length) {
          properties[keys[index]!] = param.trim();
        }
      });
      return properties;
    }
    // Fallback to default value parsing if not in PULSE format
    properties.value = valueString;
    return properties;
  }

  // For MOSFET components, parse model, W and L from value string like "N90 W=1u L=0.09u"
  if (componentType === "nFET" || componentType === "pFET") {
    // Parse format: "ModelName W=value L=value"
    // The model is the first token (no prefix), followed by W= and L= parameters
    const tokens = valueString.trim().split(/\s+/);

    if (tokens.length > 0) {
      // First token is the model name
      const firstToken = tokens[0]!;

      // Check if first token looks like a parameter (contains =), if not it's the model
      if (!firstToken!.includes("=")) {
        properties.model = firstToken!;
      }

      // Parse W and L parameters from the remaining tokens
      const wMatch = valueString.match(/W=([^\s]+)/i);
      const lMatch = valueString.match(/L=([^\s]+)/i);

      if (wMatch) {
        properties.W = wMatch[1]!;
      }
      if (lMatch) {
        properties.L = lMatch[1]!;
      }

      // Parse other optional parameters
      const mMatch = valueString.match(/m=([^\s]+)/i);
      const adMatch = valueString.match(/ad=([^\s]+)/i);
      const asMatch = valueString.match(/as=([^\s]+)/i);

      if (mMatch) properties.m = mMatch[1]!;
      if (adMatch) properties.ad = adMatch[1]!;
      if (asMatch) properties.as = asMatch[1]!;
    }

    return properties;
  }

  if (componentType === "OPAMP90") {
    properties.model = valueString.trim() || "chang90";
    return properties;
  }

  // For port components, the value string is the netName
  if (componentType === "port") {
    properties.netName = valueString;
    return properties;
  }

  // Default fallback
  properties.value = valueString;
  return properties;
}

// Helper function to serialize component properties to value string
export function serializeComponentProperties(
  componentType: ComponentType,
  properties: Partial<ComponentProperties>
): string {
  // For SIN sources, serialize to "SIN(offset amplitude frequency delay damping phase)"
  if (componentType === "vsin" || componentType === "isin") {
    const isVoltage = componentType === "vsin";

    if (isVoltage) {
      const props = properties as Partial<VoltageSourceProperties>;
      const params = [
        props.offset || "0",
        props.amplitude || "0",
        props.frequency || "0",
        props.delay || "0",
        props.damping || "0",
        props.phase || "0",
      ];

      // Remove trailing zeros for cleaner output
      while (params.length > 2 && params[params.length - 1] === "0") {
        params.pop();
      }

      const sinPart = `SIN(${params.join(" ")})`;
      // Prepend DC value if present and non-zero
      if (props.dcValue && props.dcValue !== "0") {
        return `DC ${props.dcValue} ${sinPart}`;
      }
      return sinPart;
    } else {
      const props = properties as Partial<CurrentSourceProperties>;
      const params = [
        props.offset || "0",
        props.amplitude || "0",
        props.frequency || "0",
        props.delay || "0",
        props.damping || "0",
        props.phase || "0",
      ];

      // Remove trailing zeros for cleaner output
      while (params.length > 2 && params[params.length - 1] === "0") {
        params.pop();
      }

      const sinPart = `SIN(${params.join(" ")})`;
      // Prepend DC value if present and non-zero
      if (props.dcValue && props.dcValue !== "0") {
        return `DC ${props.dcValue} ${sinPart}`;
      }
      return sinPart;
    }
  }

  // For PULSE sources, serialize to "PULSE(v1/i1 v2/i2 time_delay rise_time fall_time width period)"
  if (componentType === "vpulse" || componentType === "ipulse") {
    const isVoltage = componentType === "vpulse";

    if (isVoltage) {
      const props = properties as Partial<VoltageSourceProperties>;
      const params = [
        props.v1 || "0",
        props.v2 || "0",
        props.timeDelay || "0",
        props.riseTime || "0",
        props.fallTime || "0",
        props.width || "0",
        props.period || "0",
      ];

      // Remove trailing zeros for cleaner output (but keep at least width and period)
      while (params.length > 6 && params[params.length - 1] === "0") {
        params.pop();
      }

      const pulsePart = `PULSE(${params.join(" ")})`;
      // Prepend DC value if present and non-zero
      if (props.dcValue && props.dcValue !== "0") {
        return `DC ${props.dcValue} ${pulsePart}`;
      }
      return pulsePart;
    } else {
      const props = properties as Partial<CurrentSourceProperties>;
      const params = [
        props.i1 || "0",
        props.i2 || "0",
        props.timeDelay || "0",
        props.riseTime || "0",
        props.fallTime || "0",
        props.width || "0",
        props.period || "0",
      ];

      // Remove trailing zeros for cleaner output (but keep at least width and period)
      while (params.length > 6 && params[params.length - 1] === "0") {
        params.pop();
      }

      const pulsePart = `PULSE(${params.join(" ")})`;
      // Prepend DC value if present and non-zero
      if (props.dcValue && props.dcValue !== "0") {
        return `DC ${props.dcValue} ${pulsePart}`;
      }
      return pulsePart;
    }
  }

  // For MOSFET components, serialize W and L
  if (componentType === "nFET" || componentType === "pFET") {
    const props = properties as Partial<FETProperties>;
    const parts: string[] = [];

    // Model comes first without prefix (e.g., "N90")
    if (props.model) parts.push(props.model);

    // Then W and L with prefixes
    if (props.W) parts.push(`W=${props.W}`);
    if (props.L) parts.push(`L=${props.L}`);

    // Optional parameters
    if (props.m) parts.push(`m=${props.m}`);
    if (props.ad) parts.push(`ad=${props.ad}`);
    if (props.as) parts.push(`as=${props.as}`);

    return parts.join(" ");
  }


  if (componentType === "OPAMP90") {
    const props = properties as Partial<OpampProperties>;
    return props.model || "";
  }

  // For port components, serialize the netName
  if (componentType === "port") {
    const props = properties as Partial<PortProperties>;
    return props.netName || "";
  }

  // For simple components, return the value
  const props = properties as Record<string, string>;
  return props.value || "";
}

// Utility functions for working with SelectedItem from schematic library
export function getPropertiesFromSelectedItem(selectedItem: SelectedItem): {
  name: string;
  properties: Partial<ComponentProperties>;
} {
  if (selectedItem.type === "none") {
    return { name: "", properties: {} };
  }

  // Handle instance types (components like resistor, capacitor, etc.)
  if (selectedItem.type === "instance") {
    const componentType = selectedItem.typeName;
    const parsedProperties = parseComponentProperties(
      componentType,
      selectedItem.value || ""
    );

    return {
      name: selectedItem.name || "",
      properties: parsedProperties,
    };
  }

  // Handle wire types
  if (selectedItem.type === "wire") {
    return {
      name: selectedItem.netName || "",
      properties: {},
    };
  }

  // Handle junction types
  if (selectedItem.type === "junction") {
    return {
      name: selectedItem.netName || "",
      properties: {},
    };
  }

  // Fallback for other item types
  return { name: "", properties: {} };
}

// Helper function to apply properties back to a selected item
export function applyPropertiesToSelectedItem(
  selectedItem: SelectedItem,
  name: string,
  properties: Partial<ComponentProperties>
): { name: string; value: string } {
  // For wire types, apply netName instead of value
  if (selectedItem.type === "wire" || selectedItem.type === "junction") {
    return { name, value: "" };
  }

  if (selectedItem.type === "instance") {
    const componentType = selectedItem.typeName;
    const serializedValue = serializeComponentProperties(
      componentType,
      properties
    );
    return { name, value: serializedValue };
  }

  return { name, value: "" };
}
