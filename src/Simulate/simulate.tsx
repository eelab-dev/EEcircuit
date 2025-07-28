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
  Menu,
} from "@chakra-ui/react";
import React, { Suspense, useEffect, useState, useRef } from "react";
import EditorCustom from "../editor/editorCustom";
import { useColorModeValue } from "../components/ui/color-mode";
import { Skeleton } from "@chakra-ui/react";
import DcConfig from "./simConfigs/dc";
import AcConfig from "./simConfigs/ac";
import TransConfig from "./simConfigs/tran";
import { toaster } from "../components/ui/toaster";
import { X } from "lucide-react";
import {
  SimulationType,
  ToBePlotted,
  SimulationDC,
  SimulationAC,
  SimulationTransient,
} from "../types/commonTypes";
import {
  useSimulationState,
  usePlotSelectionState,
  useAppStore,
} from "../store/appStore";

// Define the simulation type options
const simType: SimulationType["type"][] = ["None", "DC", "AC", "Transient"];

type SimulationEditorProps = {
  netList: string;
  onSwitchToSchematic?: () => void;
};

const SimulationEditor: React.FC<SimulationEditorProps> = ({
  netList = "",
  onSwitchToSchematic,
}) => {
  // Get state and actions from Zustand store
  const {
    selectedSimType,
    simulationConfig,
    allSimulationConfigs,
    setSelectedSimType,
    setSimulationConfig,
    setAllSimulationConfigs,
  } = useSimulationState();

  const { toBePlotted, removeToBePlotted } = usePlotSelectionState();

  // Import handleNewResults from the main app store for handling simulation results
  const { handleNewResults } = useAppStore();

  // All values now come directly from store, no prop fallbacks needed

  // Local state for UI management
  const [netListToSim, setNetListToSim] = useState(netList);
  const [simCommandString, setSimCommandString] = useState("");
  // Use store's allSimulationConfigs instead of local state
  const simulationConfigs = allSimulationConfigs;
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(-1);
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [editingConfigIndex, setEditingConfigIndex] = useState(-1);
  const [editingConfigName, setEditingConfigName] = useState("");

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
      setSimulationConfig(simulationConfigs[configIndex]); // Use store action directly
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
    const prev = simulationConfigs;
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
        return;
    }

    setSelectedConfigIndex(prev.length); // Will be the index of the new config
    const newConfigs = [...prev, newConfig];
    setAllSimulationConfigs(newConfigs); // Update store

    setIsAddingConfig(false);
    setNewConfigName("");
  };

  // Function to delete a config
  const deleteConfig = (configIndex: number) => {
    const newConfigs = simulationConfigs.filter(
      (_, index) => index !== configIndex
    );
    setAllSimulationConfigs(newConfigs);

    if (selectedConfigIndex === configIndex) {
      setSelectedConfigIndex(-1);
      setSimulationConfig({ type: "None" }); // Use store action directly
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
      const updatedConfigs = simulationConfigs.map((config, index) => {
        if (index === editingConfigIndex && config.type !== "None") {
          const newConfig = { ...config, name: editingConfigName.trim() };
          // If this is the currently selected config, update the current simulation config too
          if (editingConfigIndex === selectedConfigIndex) {
            setSimulationConfig(newConfig); // Store action already called above, remove redundant call
          }
          return newConfig;
        }
        return config;
      });

      setAllSimulationConfigs(updatedConfigs);
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
        const existingConfigIndex = simulationConfigs.findIndex(
          (config) =>
            JSON.stringify(config) === JSON.stringify(simulationConfig)
        );

        if (existingConfigIndex === -1) {
          // Add new config if it doesn't exist and is valid
          const configWithName = {
            ...simulationConfig,
            name:
              simulationConfig.name ||
              generateDefaultConfigName(
                simulationConfig.type,
                simulationConfigs
              ),
          };
          setSelectedConfigIndex(simulationConfigs.length);
          const newConfigs = [...simulationConfigs, configWithName];
          setAllSimulationConfigs(newConfigs);
        } else {
          // Select existing config
          setSelectedConfigIndex(existingConfigIndex);
        }
      }
    }
  }, [
    simulationConfig,
    simulationConfigs,
    isConfigValid,
    generateDefaultConfigName,
    setAllSimulationConfigs,
  ]); // Simplified dependencies to prevent other circular issues

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
      // Update the store's current simulation config
      lastSentConfigRef.current = config;
      setSimulationConfig(config); // Use store action directly

      // Only save valid configurations to our local array (non-empty forms)
      const configIsValid = isConfigValid(config);

      if (!configIsValid) {
        return; // Don't save invalid configs to the array
      }

      // Update the current configuration in the array
      if (selectedConfigIndex >= 0) {
        // Update existing config at the selected index
        if (selectedConfigIndex < simulationConfigs.length) {
          const updated = simulationConfigs.map((item, index) => {
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
          setAllSimulationConfigs(updated);
        }
      } else if (config.type !== "None") {
        // Create new config if none is selected and config is valid
        const configWithName = {
          ...config,
          name:
            ("name" in config && config.name) ||
            generateDefaultConfigName(config.type, simulationConfigs),
        };
        const newConfigs = [...simulationConfigs, configWithName];
        setSelectedConfigIndex(newConfigs.length - 1);
        setAllSimulationConfigs(newConfigs);
      }
    },
    [
      selectedConfigIndex,
      setSimulationConfig, // Removed onSimulationConfigChange as it's no longer used
      simulationConfigs,
      isConfigValid,
      generateDefaultConfigName,
      setAllSimulationConfigs,
    ] // Include all dependencies
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
        return; // Don't call handleNewResults, preventing tab switch
      }

      // Valid results, proceed normally
      handleNewResults([result]);
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
        <Flex
          padding="2"
          borderBottom="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          justifyContent="flex-start"
          alignItems="center"
          gap="2"
        >
          {/* "To Be Plotted" button with dropdown if items exist */}
          {toBePlotted.length > 0 ? (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button size="sm" variant="outline">
                  To Be Plotted ({toBePlotted.length})
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  {toBePlotted.map((item, index) => (
                    <Menu.Item key={index} value={`${item.type}-${item.name}`}>
                      <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        width="100%"
                      >
                        <span>
                          {item.type}({item.name})
                        </span>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Remove the item from the toBePlotted list
                            removeToBePlotted(item);
                          }}
                          aria-label={`Remove ${item.type}(${item.name})`}
                        >
                          <X size={12} />
                        </IconButton>
                      </Flex>
                    </Menu.Item>
                  ))}
                  <Menu.Separator />
                  <Menu.Item
                    value="add-more"
                    onClick={() => {
                      onSwitchToSchematic?.();
                    }}
                  >
                    Add More...
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onSwitchToSchematic?.();
              }}
            >
              To Be Plotted
            </Button>
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
                  // Update store with selected simulation type
                  setSelectedSimType(value.value);

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

                  // Update store directly
                  setSimulationConfig(newConfig); // Use store action directly
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
