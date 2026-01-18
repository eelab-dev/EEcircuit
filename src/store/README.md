# Store Architecture

The application store has been modularized into smaller, domain-specific stores for better maintainability and readability.

## Architecture Overview

The store is now split into the following modules:

### 1. Tab Store (`tabStore.ts`)

**Responsibility:** Tab management state and navigation

- `mainTabValue`: Current active tab
- `isSimulationTabEnabled`: Whether simulate tab is available
- `isPlottingTabEnabled`: Whether plot tab is available

**Actions:**

- `setMainTabValue(tab)`: Switch to a specific tab
- `setIsSimulationTabEnabled(enabled)`: Enable/disable simulate tab
- `setIsPlottingTabEnabled(enabled)`: Enable/disable plot tab

### 2. Schematic Store (`schematicStore.ts`)

**Responsibility:** Schematic canvas state and management

- `shouldFitToScreen`: Whether to fit schematic to screen
- `hasResizedSinceSchematicView`: Track resize events
- `hasViewedSchematic`: Whether user has viewed schematic
- `currentSchematic`: Current schematic data

**Actions:**

- `setShouldFitToScreen(should)`: Control fit-to-screen behavior
- `setHasResizedSinceSchematicView(has)`: Track resize state
- `setHasViewedSchematic(has)`: Mark schematic as viewed
- `setCurrentSchematic(schematic)`: Update current schematic

### 3. Simulation Store (`simulationStore.ts`)

**Responsibility:** Simulation configuration and netlist management

- `netList`: Generated netlist from schematic
- `results`: Simulation results data
- `selectedSimType`: Currently selected simulation type
- `simulationConfig`: Current simulation configuration
- `allSimulationConfigs`: All saved simulation configurations

**Actions:**

- `setNetList(netList)`: Update the netlist
- `setResults(results)`: Store simulation results
- `setSelectedSimType(type)`: Select simulation type
- `setSimulationConfig(config)`: Set current config
- `setAllSimulationConfigs(configs)`: Set all configs
- `addSimulationConfig(config)`: Add new config
- `updateSimulationConfig(index, config)`: Update existing config
- `deleteSimulationConfig(index)`: Remove config
- `exportNetlist(netlist)`: Export netlist and enable simulate tab

### 4. Plot Store (`plotStore.ts`)

**Responsibility:** Plot data management and variable selection

- `isToBePlottedMode`: Whether the to-be-plotted selection mode is active
- `toBePlotted`: Variables marked for plotting
- `selectedVariables`: Currently selected plot variables
- `hoveredVariable`: Currently hovered variable

**Actions:**

- `setIsToBePlottedMode(mode)`: Toggle to-be-plotted selection mode
- `setToBePlotted(items)`: Set variables to plot
- `addToBePlotted(item)`: Add variable to plot
- `removeToBePlotted(item)`: Remove variable from plot
- `setSelectedVariables(variables)`: Select variables for display
- `setHoveredVariable(variable)`: Set hovered variable
- `handleNewResults(results)`: Process new simulation results
- `enterToBePlottedMode()`: Enter to-be-plotted selection mode
- `exitToBePlottedMode()`: Exit to-be-plotted selection mode

### 5. UI Store (`uiStore.ts`)

**Responsibility:** General UI state and preferences

- `inputProfile`: Mouse or trackpad input mode
- `dragBox`: Whether drag & drop box is shown

**Actions:**

- `setInputProfile(profile)`: Set input profile
- `setDragBox(show)`: Show/hide drag & drop box
- `toggleInputProfile()`: Switch between mouse/trackpad modes

## Main Store (`appStore.ts`)

The main store combines all domain stores using Zustand's slice pattern:

```typescript
export const useAppStore = create<AppStore>()((...a) => ({
  ...createTabSlice(...a),
  ...createSchematicSlice(...a),
  ...createSimulationSlice(...a),
  ...createPlotSlice(...a),
  ...createUiSlice(...a),
}));
```

## Clean Architecture

This modular approach provides a clean, maintainable architecture without any backward compatibility layers. Components should access the store directly using specific selectors.

## Benefits

1. **Separation of Concerns**: Each store handles a specific domain
2. **Improved Maintainability**: Easier to understand and modify individual domains
3. **Better Testability**: Each store can be tested independently
4. **Reduced Complexity**: Smaller, focused files instead of one large file
5. **Type Safety**: Better TypeScript support with domain-specific types
6. **Easier Extension**: Adding new functionality to a specific domain is simpler

## Usage

Components access the store directly using specific selectors:

```typescript
// Direct store access for specific state and actions
const mainTabValue = useAppStore((state) => state.mainTabValue);
const setMainTabValue = useAppStore((state) => state.setMainTabValue);
const selectedSimType = useAppStore((state) => state.selectedSimType);
const setSelectedSimType = useAppStore((state) => state.setSelectedSimType);

// Multiple selectors for efficiency
const { results, selectedVariables } = useAppStore((state) => ({
  results: state.results,
  selectedVariables: state.selectedVariables,
}));
```

## File Structure

```
src/store/
├── appStore.ts          # Main combined store only
├── tabStore.ts          # Tab management
├── schematicStore.ts    # Schematic state
├── simulationStore.ts   # Simulation & netlist
├── plotStore.ts         # Plot data & variables
└── uiStore.ts          # UI preferences
```
