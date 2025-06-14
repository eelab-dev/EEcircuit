# Component Property Type System

This document explains the new TypeScript type system for component properties in EEsim.

## Overview

The property type system provides:

- Type-safe component properties based on the actual available components from `eecircuit-schematic`
- Dynamic form generation for property dialogs
- Consistent property parsing and serialization
- Extensible architecture for adding new component types

## Key Features

### 1. Type Safety

The `ComponentType` is directly derived from the `AvailableComponent["type"]` from the schematic library, ensuring perfect synchronization:

```typescript
export type ComponentType = AvailableComponent["type"];
```

### 2. Component-Specific Properties

Each component type has its own property interface:

- **Resistor**: `value` (e.g., "1k", "10ohm")
- **Capacitor**: `value` + optional `ic` (initial condition)
- **Inductor**: `value` + optional `ic` (initial condition)
- **nFET/pFET**: `W` (width), `L` (length), plus optional parameters like `model`, `m`, `ad`, `as`
- **Voltage/Current Sources**: `value` with appropriate units
- **Power Nodes**: `value` for voltage level
- **Ports**: optional `portType` and `value`

### 3. Dynamic Form Generation

The `componentPropertyConfigs` object defines the form fields for each component type:

```typescript
export const componentPropertyConfigs: Record<ComponentType, PropertyField[]> =
  {
    nFET: [
      {
        key: "W",
        label: "Width",
        type: "text",
        placeholder: "e.g., 10u, 1m",
        required: true,
        unit: "m",
      },
      // ... more fields
    ],
  };
```

### 4. Utility Functions

Helper functions provide easy integration with the schematic library:

- `getPropertiesFromSelectedItem(selectedItem)`: Extract properties from a selected component
- `applyPropertiesToSelectedItem(selectedItem, name, properties)`: Apply properties back to a component
- `parseComponentProperties(componentType, valueString)`: Parse value string into typed properties
- `serializeComponentProperties(componentType, properties)`: Serialize properties back to value string

## Usage Example

```typescript
import {
  getPropertiesFromSelectedItem,
  applyPropertiesToSelectedItem,
} from "../types/componentTypes";

// Extract properties from a selected component
const { name, properties } = getPropertiesFromSelectedItem(selectedItem);

// Modify properties
const updatedProperties = {
  ...properties,
  W: "20u",
  L: "0.18u",
};

// Apply back to component
const result = applyPropertiesToSelectedItem(
  selectedItem,
  name,
  updatedProperties
);
onApply(result.name, result.value);
```

## MOSFET Example

For MOSFETs (nFET/pFET), the value string is parsed from formats like:

- `W=10u L=0.18u` → `{ W: '10u', L: '0.18u' }`
- `W=20u L=0.18u model=nch m=2` → `{ W: '20u', L: '0.18u', model: 'nch', m: '2' }`

## Extending the System

To add support for new component types:

1. The type will automatically be available when added to the schematic library
2. Add the property configuration to `componentPropertyConfigs`
3. Create a property interface if needed
4. Update the `ComponentProperties` union type

## Property Dialog

The properties dialog automatically adapts based on the component type:

- Shows appropriate input fields based on `componentPropertyConfigs`
- Displays units and validation hints
- Handles required vs optional fields
- Supports different input types (text, select, etc.)
