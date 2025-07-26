import {
  Button,
  Flex,
  Group,
  RadioCard,
  RadioCardValueChangeDetails,
  NativeSelectRoot,
  NativeSelectField,
  IconButton,
  HStack,
  Input,
} from "@chakra-ui/react";
import React, { Suspense, useEffect, useState, useRef } from "react";
import EditorCustom from "../editor/editorCustom";
import { useColorModeValue } from "../components/ui/color-mode";
import { Skeleton } from "@chakra-ui/react";
import DcConfig from "./simConfigs/dc";
import AcConfig from "./simConfigs/ac";
import TransConfig from "./simConfigs/tran";
import { ResultType } from "eecircuit-engine";
import { toaster } from "../components/ui/toaster";
import {
  SimulationType,
  ToBePlotted,
  SimulationDC,
  SimulationAC,
  SimulationTransient,
} from "../types/commonTypes";

// Define the simulation type options
const simType: SimulationType["type"][] = ["None", "DC", "AC", "Transient"];

type SimulationEditorProps = {
  netList: string;
  onResultsObtained: (results: ResultType[]) => void;
  selectedSimType: SimulationType["type"];
  simulationConfig?: SimulationType;
  onSimulationConfigChange: (config: SimulationType) => void;
  onSwitchToSchematic?: () => void;
  toBePlotted?: ToBePlotted[];
  onAllSimulationConfigsChange?: (configs: SimulationType[]) => void; // New prop to expose all configs
  initialConfigs?: SimulationType[]; // New prop to restore saved configs
};

const SimulationEditor: React.FC<SimulationEditorProps> = ({
  netList = "",
  onResultsObtained,
  selectedSimType,
  simulationConfig,
  onSimulationConfigChange,
  onSwitchToSchematic,
  toBePlotted = [],
  onAllSimulationConfigsChange, // New prop to expose all configs
  initialConfigs = [], // New prop to restore saved configs
}) => {
  const [netListToSim, setNetListToSim] = useState(netList);
  const [simCommandString, setSimCommandString] = useState("");

  // State to preserve all simulation configurations as an array
  // This allows users to manage multiple named simulation configurations
  const [simulationConfigs, setSimulationConfigs] = useState<SimulationType[]>(
    initialConfigs // Initialize with saved configs from parent
  );

  // Effect to restore configs from parent when initialConfigs changes
  // This handles the case where configs are loaded from a saved file
  useEffect(() => {
    if (initialConfigs.length > 0) {
      setSimulationConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // State to track the currently selected configuration index
  const [selectedConfigIndex, setSelectedConfigIndex] = useState<number>(-1);

  // State for managing config naming when adding new configs
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");

  // State for editing existing config names
  const [editingConfigIndex, setEditingConfigIndex] = useState<number>(-1);
  const [editingConfigName, setEditingConfigName] = useState("");

  // State for tracking when we need to update parent after config name edit
  const [pendingConfigUpdate, setPendingConfigUpdate] =
    useState<SimulationType | null>(null);

  // Effect to handle deferred config updates to parent
  useEffect(() => {
    if (pendingConfigUpdate) {
      onSimulationConfigChange(pendingConfigUpdate);
      setPendingConfigUpdate(null);
    }
  }, [pendingConfigUpdate, onSimulationConfigChange]);

  // Effect to notify parent component of all simulation configs changes
  // This allows the parent to save all configs when user triggers save action
  // IMPORTANT: Always send current configs on mount to ensure parent has latest state
  useEffect(() => {
    if (onAllSimulationConfigsChange) {
      onAllSimulationConfigsChange(simulationConfigs);
    }
  }, [simulationConfigs, onAllSimulationConfigsChange]);

  // Additional effect to ensure parent gets configs immediately on mount
  // This handles the case where the parent state was reset but SimulationEditor has configs
  useEffect(() => {
    if (onAllSimulationConfigsChange) {
      // Always send configs, even if empty, to ensure parent state is synchronized
      onAllSimulationConfigsChange(simulationConfigs);
    }
  }, [onAllSimulationConfigsChange]); // Only run when callback changes (mount/unmount)

  // Use a ref to track the last config we sent to parent to prevent circular updates
  const lastSentConfigRef = useRef<SimulationType | null>(null);

  // Helper function to generate a default name for a new config
  const generateDefaultConfigName = React.useCallback(
    (type: SimulationType["type"], existingConfigs: SimulationType[]) => {
      if (type === "None") return "None";

      const existingNames = existingConfigs
        .filter((config) => config.type === type)
        .map((config) => {
          if (config.type !== "None" && config.name) {
            return config.name;
          }
          return "";
        })
        .filter((name) => name !== "");

      let counter = 1;
      let name = `${type}-${counter}`;
      while (existingNames.includes(name)) {
        counter++;
        name = `${type}-${counter}`;
      }
      return name;
    },
    []
  );

  // Helper function to check if a configuration has valid (non-empty) required fields
  const isConfigValid = React.useCallback((config: SimulationType): boolean => {
    if (config.type === "None") return false; // None configs are never saved

    switch (config.type) {
      case "DC":
        return !!(
          config.source?.trim() &&
          config.start?.trim() &&
          config.stop?.trim() &&
          config.step?.trim()
        );
      case "AC":
        return !!(
          config.source?.trim() &&
          config.frequencyStart?.trim() &&
          config.frequencyStop?.trim() &&
          config.stepNumber?.trim()
        );
      case "Transient":
        return !!(config.stopTime?.trim() && config.timeStep?.trim());
      default:
        return false;
    }
  }, []);

  // Helper function to find current config by index
  const getCurrentConfig = () => {
    if (
      selectedConfigIndex < 0 ||
      selectedConfigIndex >= simulationConfigs.length
    )
      return null;
    return simulationConfigs[selectedConfigIndex] || null;
  };

  // Function to handle config selection from dropdown
  const handleConfigSelection = (configIndex: number) => {
    if (configIndex >= 0 && configIndex < simulationConfigs.length) {
      setSelectedConfigIndex(configIndex);
      onSimulationConfigChange(simulationConfigs[configIndex]);
    }
  };

  // Function to add a new config
  const addNewConfig = () => {
    // Don't create configs for "None" type - None means no configuration
    if (selectedSimType === "None") {
      setIsAddingConfig(false);
      setNewConfigName("");
      return;
    }

    // Create a new config based on the currently selected simulation type
    setSimulationConfigs((prev) => {
      const defaultName = generateDefaultConfigName(selectedSimType, prev);
      let newConfig: SimulationType;

      switch (selectedSimType) {
        case "DC":
          newConfig = {
            type: "DC",
            name: newConfigName.trim() || defaultName,
            source: "",
            start: "",
            stop: "",
            step: "",
          };
          break;
        case "AC":
          newConfig = {
            type: "AC",
            name: newConfigName.trim() || defaultName,
            source: "",
            frequencyStart: "",
            frequencyStop: "",
            stepNumber: "",
            sweepType: "dec",
          };
          break;
        case "Transient":
          newConfig = {
            type: "Transient",
            name: newConfigName.trim() || defaultName,
            stopTime: "",
            timeStep: "",
          };
          break;
        default:
          // For unsupported types, don't create a config
          return prev;
      }

      setSelectedConfigIndex(prev.length); // Will be the index of the new config
      setPendingConfigUpdate(newConfig); // Schedule update to parent component
      const newConfigs = [...prev, newConfig];
      return newConfigs;
    });

    setIsAddingConfig(false);
    setNewConfigName("");
  };

  // Function to delete a config
  const deleteConfig = (configIndex: number) => {
    setSimulationConfigs((prev) =>
      prev.filter((_, index) => index !== configIndex)
    );
    if (selectedConfigIndex === configIndex) {
      setSelectedConfigIndex(-1);
      onSimulationConfigChange({ type: "None" });
    } else if (selectedConfigIndex > configIndex) {
      // Adjust selected index if we deleted a config before the selected one
      setSelectedConfigIndex(selectedConfigIndex - 1);
    }
  };

  // Function to start editing a config name
  const startEditingConfigName = (configIndex: number) => {
    const config = simulationConfigs[configIndex];
    if (config && config.type !== "None" && "name" in config) {
      setEditingConfigIndex(configIndex);
      setEditingConfigName(config.name || "");
    }
  };

  // Function to save edited config name
  const saveEditedConfigName = () => {
    if (editingConfigIndex >= 0 && editingConfigName.trim()) {
      setSimulationConfigs((prev) => {
        const updatedConfigs = prev.map((config, index) => {
          if (index === editingConfigIndex && config.type !== "None") {
            const newConfig = { ...config, name: editingConfigName.trim() };
            // If this is the currently selected config, schedule an update to parent
            if (editingConfigIndex === selectedConfigIndex) {
              setPendingConfigUpdate(newConfig);
            }
            return newConfig;
          }
          return config;
        });

        return updatedConfigs;
      });
    }
    setEditingConfigIndex(-1);
    setEditingConfigName("");
  };

  // Function to cancel editing config name
  const cancelEditingConfigName = () => {
    setEditingConfigIndex(-1);
    setEditingConfigName("");
  };

  // Initialize the local state with the current simulation config when it changes
  // This handles the case where the parent component passes an initial configuration
  useEffect(() => {
    // Skip if this is the same config we just sent to the parent (prevents infinite loop)
    if (
      lastSentConfigRef.current &&
      JSON.stringify(lastSentConfigRef.current) ===
        JSON.stringify(simulationConfig)
    ) {
      return;
    }

    if (simulationConfig && simulationConfig.type !== "None") {
      // Only process valid configurations
      if (isConfigValid(simulationConfig)) {
        // Check if this config already exists in our array
        setSimulationConfigs((prev) => {
          const existingConfigIndex = prev.findIndex(
            (config) =>
              JSON.stringify(config) === JSON.stringify(simulationConfig)
          );

          if (existingConfigIndex === -1) {
            // Add new config if it doesn't exist and is valid
            const configWithName = {
              ...simulationConfig,
              name:
                simulationConfig.name ||
                generateDefaultConfigName(simulationConfig.type, prev),
            };
            setSelectedConfigIndex(prev.length);
            const newConfigs = [...prev, configWithName];
            return newConfigs;
          } else {
            // Select existing config
            setSelectedConfigIndex(existingConfigIndex);
            return prev; // No change to configs
          }
        });
      }
    }
  }, [simulationConfig]); // Simplified dependencies to prevent other circular issues

  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setNetListToSim(value);
    }
  }, []);

  const saveCommandConfig = (toBePlotted: ToBePlotted[]) => {
    if (toBePlotted.length === 0) {
      return "";
    }

    const saveCommands = toBePlotted
      .map((item) => {
        if (item.type === "voltage") {
          return `v(${item.name})`;
        } else if (item.type === "current") {
          return `i(${item.name})`;
        }
        return "";
      })
      .filter((cmd) => cmd !== "");

    return `.save ${saveCommands.join(" ")}`;
  };

  useEffect(() => {
    if (selectedSimType === "None") {
      setNetListToSim(netList);
      return;
    } else {
      const saveCommand = saveCommandConfig(toBePlotted);
      // Use the string command generated by config components
      const newNetList =
        netList +
        "\n\n" +
        simCommandString +
        "\n\n" +
        saveCommand +
        "\n\n" +
        ".end";
      setNetListToSim(newNetList);
    }
  }, [netList, simCommandString, selectedSimType, toBePlotted]);

  // Handler for string-based config changes from config components
  const handleStringConfigChange = React.useCallback((configString: string) => {
    // Store the generated SPICE command from config components
    setSimCommandString(configString);
  }, []);

  // Handler for receiving the full configuration object from config components
  const handleFullConfigChange = React.useCallback(
    (config: SimulationType) => {
      // Always update the parent callback to maintain existing functionality
      // This ensures the simulation engine gets the latest config
      lastSentConfigRef.current = config;
      onSimulationConfigChange(config);

      // Only save valid configurations to our local array (non-empty forms)
      const configIsValid = isConfigValid(config);

      if (!configIsValid) {
        return; // Don't save invalid configs to the array
      }

      // Update the current configuration in the array
      if (selectedConfigIndex >= 0) {
        // Update existing config at the selected index
        setSimulationConfigs((prev) => {
          if (selectedConfigIndex >= prev.length) {
            return prev;
          }

          const updated = prev.map((item, index) => {
            if (index === selectedConfigIndex) {
              if (config.type !== "None" && "name" in config) {
                const updatedConfig = {
                  ...config,
                  name:
                    config.name ||
                    (item.type !== "None" && "name" in item ? item.name : ""),
                };
                return updatedConfig;
              }
              return config;
            }
            return item;
          });
          return updated;
        });
      } else if (config.type !== "None") {
        // Create new config if none is selected and config is valid
        setSimulationConfigs((prev) => {
          const configWithName = {
            ...config,
            name:
              ("name" in config && config.name) ||
              generateDefaultConfigName(config.type, prev),
          };
          const newConfigs = [...prev, configWithName];
          setSelectedConfigIndex(newConfigs.length - 1);
          return newConfigs;
        });
      }
    },
    [selectedConfigIndex, onSimulationConfigChange] // Removed extra dependencies to prevent infinite loops
  );

  const handleSimRun = async () => {
    const { Simulation } = await import("eecircuit-engine");

    const sim = new Simulation();
    await sim.start();

    sim.setNetList(netListToSim);

    const result = await sim.runSim();

    if (result) {
      // Check if the result has valid data and variables
      const hasData = result.data && result.data.length > 0;
      const hasVariables =
        result.variableNames && result.variableNames.length > 0;

      // Additional check for actual data points in the result
      let hasDataPoints = false;
      if (hasData) {
        hasDataPoints = result.data.some(
          (dataSet) => dataSet.values && dataSet.values.length > 0
        );
      }

      if (!hasData || !hasVariables || !hasDataPoints) {
        // Show error toast for empty results
        toaster.create({
          title: "Simulation Error",
          description:
            "Simulation run but no results were generated. Check your netlist and simulation configuration.",
          type: "error",
          duration: 5000,
        });
        console.error("Simulation completed but returned empty results.");
        return; // Don't call onResultsObtained, preventing tab switch
      }

      // Valid results, proceed normally
      onResultsObtained([result]);
    } else {
      // Show error toast for failed simulation
      toaster.create({
        title: "Simulation Error",
        description: "Simulation failed to run. Check your netlist for errors.",
        type: "error",
        duration: 5000,
      });
      console.error("Simulation failed or returned no results.");
    }
  };

  return (
    <Flex
      width="100%"
      flexDirection={"row"}
      height="100%"
      overflow="hidden"
      position="relative"
      css={{
        "& *": {
          scrollbarWidth: "thin",
        },
        "&, & *": {
          overscrollBehavior: "contain",
        },
      }}
    >
      {/* Editor on the left */}
      <Flex flex="1" flexDirection="column" height="100%" overflow="hidden">
        {/* To Be Plotted button */}
        <Flex
          padding="2"
          borderBottom="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          justifyContent="flex-start"
          alignItems="center"
          gap="2"
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSwitchToSchematic?.();
            }}
          >
            To Be Plotted
          </Button>
          {/* Display current selected items */}
          {toBePlotted.length > 0 && (
            <span style={{ fontSize: "0.8rem", color: "gray" }}>
              ({toBePlotted.length} selected)
            </span>
          )}
          {/* Show detailed list of selected items */}
          {toBePlotted.length > 0 && (
            <div
              style={{ fontSize: "0.75rem", color: "gray", marginLeft: "10px" }}
            >
              {toBePlotted.map((item, index) => (
                <span key={index}>
                  {item.type}({item.name})
                  {index < toBePlotted.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
        </Flex>

        <Suspense fallback={<Skeleton height="100%" width="100%" />}>
          <EditorCustom
            height="100%"
            width="100%"
            language="spice"
            value={netListToSim}
            valueChanged={handleEditor}
            theme={useColorModeValue("light", "dark")}
          />
        </Suspense>
      </Flex>

      {/* Simulation options on the right */}
      <Flex
        flexDirection="column"
        minWidth="300px"
        maxWidth="400px"
        height="100%"
        overflow="hidden"
        borderLeft="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.600")}
        position="relative"
      >
        {/* Scrollable config area */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: "80px",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollbarColor: useColorModeValue(
              "rgb(203, 213, 225) transparent",
              "rgb(75, 85, 99) transparent"
            ),
          }}
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          <Flex flexDirection="column" gap={4}>
            {/* Configuration Management Dropdown */}
            {selectedSimType !== "None" && (
              <Flex flexDirection="column" gap={2}>
                <HStack justifyContent="space-between" alignItems="center">
                  <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                    Simulation Configuration
                  </span>
                  <IconButton
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingConfig(true)}
                    aria-label="Add configuration"
                  >
                    +
                  </IconButton>
                </HStack>

                {isAddingConfig ? (
                  <HStack gap={2}>
                    <Input
                      size="sm"
                      placeholder="Config name"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addNewConfig();
                        } else if (e.key === "Escape") {
                          setIsAddingConfig(false);
                          setNewConfigName("");
                        }
                      }}
                    />
                    <Button size="sm" onClick={addNewConfig}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingConfig(false);
                        setNewConfigName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </HStack>
                ) : (
                  <HStack gap={2}>
                    <NativeSelectRoot size="sm" flex="1">
                      <NativeSelectField
                        value={
                          selectedConfigIndex >= 0
                            ? selectedConfigIndex.toString()
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "add-new") {
                            setIsAddingConfig(true);
                          } else if (value) {
                            handleConfigSelection(parseInt(value));
                          }
                        }}
                      >
                        <option value="">Select Configuration</option>
                        {simulationConfigs.map((config, index) => (
                          <option key={index} value={index.toString()}>
                            {config.type !== "None" &&
                            "name" in config &&
                            config.name
                              ? config.name
                              : `Config ${index + 1}`}{" "}
                            ({config.type})
                          </option>
                        ))}
                        <option value="add-new">+ Add New</option>
                      </NativeSelectField>
                    </NativeSelectRoot>
                    {selectedConfigIndex >= 0 && (
                      <>
                        <IconButton
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEditingConfigName(selectedConfigIndex)
                          }
                          aria-label="Edit configuration name"
                        >
                          ✏️
                        </IconButton>
                        <IconButton
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          onClick={() => deleteConfig(selectedConfigIndex)}
                          aria-label="Delete configuration"
                        >
                          ×
                        </IconButton>
                      </>
                    )}
                  </HStack>
                )}

                {/* Config name editing interface */}
                {editingConfigIndex >= 0 && (
                  <HStack gap={2}>
                    <Input
                      size="sm"
                      placeholder="Configuration name"
                      value={editingConfigName}
                      onChange={(e) => setEditingConfigName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveEditedConfigName();
                        } else if (e.key === "Escape") {
                          cancelEditingConfigName();
                        }
                      }}
                    />
                    <Button size="sm" onClick={saveEditedConfigName}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingConfigName}
                    >
                      Cancel
                    </Button>
                  </HStack>
                )}
              </Flex>
            )}

            <RadioCard.Root
              defaultValue={simType[0]}
              value={selectedSimType}
              gap="4"
              onValueChange={(value: RadioCardValueChangeDetails) => {
                if (
                  value.value &&
                  (value.value === "None" ||
                    value.value === "DC" ||
                    value.value === "AC" ||
                    value.value === "Transient")
                ) {
                  // Create simulation config based on type
                  let newConfig: SimulationType;

                  if (value.value === "None") {
                    newConfig = { type: "None" };
                    setSimCommandString(""); // Clear command for None type
                    setSelectedConfigIndex(-1); // No config selected for None
                  } else {
                    // For non-None types, check if we have an existing config of this type
                    const currentConfig = getCurrentConfig();

                    if (currentConfig && currentConfig.type === value.value) {
                      // Use current config if it matches the selected type
                      newConfig = currentConfig;
                    } else {
                      // Look for existing valid configs of this type
                      const existingValidConfigs = simulationConfigs
                        .map((config, index) => ({ config, index }))
                        .filter(
                          (item) =>
                            item.config.type === value.value &&
                            isConfigValid(item.config)
                        );

                      if (existingValidConfigs.length > 0) {
                        // Use the most recent valid config
                        const mostRecentConfig =
                          existingValidConfigs[existingValidConfigs.length - 1];
                        newConfig = mostRecentConfig.config;
                        setSelectedConfigIndex(mostRecentConfig.index);
                      } else {
                        // Create an empty config for this type (not saved until validated)
                        const defaultName = generateDefaultConfigName(
                          value.value,
                          simulationConfigs
                        );
                        switch (value.value) {
                          case "DC":
                            newConfig = {
                              type: "DC",
                              name: defaultName,
                              source: "",
                              start: "",
                              stop: "",
                              step: "",
                            };
                            break;
                          case "AC":
                            newConfig = {
                              type: "AC",
                              name: defaultName,
                              source: "",
                              frequencyStart: "",
                              frequencyStop: "",
                              stepNumber: "",
                              sweepType: "dec",
                            };
                            break;
                          case "Transient":
                            newConfig = {
                              type: "Transient",
                              name: defaultName,
                              stopTime: "",
                              timeStep: "",
                            };
                            break;
                          default:
                            newConfig = { type: "None" };
                            setSimCommandString("");
                        }

                        // Don't add empty configs to the array automatically
                        // They will be added by handleFullConfigChange when they become valid
                        setSelectedConfigIndex(-1);
                      }
                    }
                  }

                  onSimulationConfigChange(newConfig);
                }
              }}
            >
              <RadioCard.Label>Simulation type</RadioCard.Label>
              <Group
                attached
                display="grid"
                gridTemplateColumns="repeat(2, 1fr)"
                gap="0"
              >
                {simType.map((type) => (
                  <RadioCard.Item key={type} value={type} width="full">
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl>
                      <RadioCard.ItemIndicator />
                      <RadioCard.ItemContent>
                        <RadioCard.ItemText>{type}</RadioCard.ItemText>
                      </RadioCard.ItemContent>
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </Group>
            </RadioCard.Root>
            {(() => {
              switch (selectedSimType) {
                case "None":
                  return (
                    <>
                      <p>No addition to the netlist</p>
                    </>
                  );
                case "DC":
                  return (
                    <DcConfig
                      key={`dc-${selectedConfigIndex}`} // Force re-render when config changes
                      onConfigChange={handleStringConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        // Use currently selected config instead of simulationConfig
                        // This ensures config switching between same type works properly
                        getCurrentConfig()?.type === "DC"
                          ? (getCurrentConfig() as SimulationDC)
                          : undefined
                      }
                    />
                  );
                case "AC":
                  return (
                    <AcConfig
                      key={`ac-${selectedConfigIndex}`} // Force re-render when config changes
                      onConfigChange={handleStringConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        // Use currently selected config instead of simulationConfig
                        // This ensures config switching between same type works properly
                        getCurrentConfig()?.type === "AC"
                          ? (getCurrentConfig() as SimulationAC)
                          : undefined
                      }
                    />
                  );
                case "Transient":
                  return (
                    <TransConfig
                      key={`transient-${selectedConfigIndex}`} // Force re-render when config changes
                      onConfigChange={handleStringConfigChange}
                      onFullConfigChange={handleFullConfigChange}
                      initialData={
                        // Use currently selected config instead of simulationConfig
                        // This ensures config switching between same type works properly
                        getCurrentConfig()?.type === "Transient"
                          ? (getCurrentConfig() as SimulationTransient)
                          : undefined
                      }
                    />
                  );
              }
            })()}
          </Flex>
        </div>

        {/* Fixed button at bottom */}
        <Flex
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          height="80px"
          padding="4"
          backgroundColor={useColorModeValue("white", "gray.800")}
          borderTop="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          alignItems="center"
        >
          <Button onClick={handleSimRun} width="100%">
            Run Simulation
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SimulationEditor;
