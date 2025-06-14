// Component property type definitions for EEsim
import { AvailableComponent, SelectedItem } from "eecircuit-schematic";

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
  type?: "dc" | "ac" | "pulse" | "sin"; // Source type
}

export interface CurrentSourceProperties extends BaseComponentProperties {
  value: string; // e.g., "1mA", "10uA"
  type?: "dc" | "ac" | "pulse" | "sin"; // Source type
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
      {
        key: "portType",
        label: "Port Type",
        type: "select",
        required: false,
        options: ["input", "output", "inout"],
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
  if (config.length === 1 && config[0].key === "value") {
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
      const firstToken = tokens[0];

      // Check if first token looks like a parameter (contains =), if not it's the model
      if (!firstToken.includes("=")) {
        properties.model = firstToken;
      }

      // Parse W and L parameters from the remaining tokens
      const wMatch = valueString.match(/W=([^\s]+)/i);
      const lMatch = valueString.match(/L=([^\s]+)/i);

      if (wMatch) {
        properties.W = wMatch[1];
      }
      if (lMatch) {
        properties.L = lMatch[1];
      }

      // Parse other optional parameters
      const mMatch = valueString.match(/m=([^\s]+)/i);
      const adMatch = valueString.match(/ad=([^\s]+)/i);
      const asMatch = valueString.match(/as=([^\s]+)/i);

      if (mMatch) properties.m = mMatch[1];
      if (adMatch) properties.ad = adMatch[1];
      if (asMatch) properties.as = asMatch[1];
    }

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
