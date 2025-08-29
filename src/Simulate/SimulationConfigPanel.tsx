import {
  Button,
  Box,
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
import React, { useState } from "react";
import DcConfig from "./simConfigs/dc";
import AcConfig from "./simConfigs/ac";
import TransConfig from "./simConfigs/tran";
import {
  SimulationType,
  SimulationDC,
  SimulationAC,
  SimulationTransient,
} from "../types/commonTypes";
import { useAppStore } from "../store/appStore";

// Define the simulation type options
const simType: SimulationType["type"][] = ["None", "DC", "AC", "Transient"];

interface SimulationConfigPanelProps {
  onStringConfigChange: (configString: string) => void;
  onFullConfigChange: (config: SimulationType) => void;
}

const SimulationConfigPanel: React.FC<SimulationConfigPanelProps> = ({
  onStringConfigChange,
  onFullConfigChange,
}) => {
  // Get state and actions from Zustand store
  const selectedSimType = useAppStore((state) => state.selectedSimType);
  const simulationConfig = useAppStore((state) => state.simulationConfig);
  const allSimulationConfigs = useAppStore(
    (state) => state.allSimulationConfigs
  );
  const netList = useAppStore((state) => state.netList);
  const setSelectedSimType = useAppStore((state) => state.setSelectedSimType);
  const setAllSimulationConfigs = useAppStore(
    (state) => state.setAllSimulationConfigs
  );

  // Local state for UI management
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(-1);
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [editingConfigIndex, setEditingConfigIndex] = useState(-1);
  const [editingConfigName, setEditingConfigName] = useState("");

  // Helper function to generate a default name for a new config
  const generateDefaultConfigName = (
    type: SimulationType["type"],
    existingConfigs: SimulationType[]
  ) => {
    if (type === "None") return "None";

    const existingNames = existingConfigs
      .filter((config) => config.type === type)
      .map((config) => {
        if (config.type !== "None" && "name" in config) {
          return config.name || "";
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
  };

  // Helper function to check if a configuration is valid
  const isConfigValid = (config: SimulationType): boolean => {
    if (config.type === "None") return false;

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
  };

  // Synchronize selectedConfigIndex with store state when configs are loaded from file
  React.useEffect(() => {
    if (allSimulationConfigs.length > 0) {
      if (simulationConfig && selectedConfigIndex === -1) {
        // Existing logic: sync with existing store selection
        const currentConfigIndex = allSimulationConfigs.findIndex((config) => {
          if (config.type === "None" || simulationConfig.type === "None") return false;
          if (config.type !== simulationConfig.type) return false;
          
          // For more robust matching, check if this is the same config object
          if (config === simulationConfig) return true;
          
          // Fallback: match by name and type
          if ("name" in config && "name" in simulationConfig) {
            return config.name === simulationConfig.name;
          }
          
          return false;
        });
        
        if (currentConfigIndex >= 0) {
          setSelectedConfigIndex(currentConfigIndex);
          // Trigger config string update
          onFullConfigChange(simulationConfig);
        }
      } else if (!simulationConfig && selectedSimType === "None") {
        // NEW logic: auto-select first config when configs are available but none is selected
        const firstConfig = allSimulationConfigs[0];
        if (firstConfig) {
          setSelectedConfigIndex(0);
          setSelectedSimType(firstConfig.type);
          onFullConfigChange(firstConfig);
        }
      }
    } else if (selectedSimType === "None") {
      // Reset to -1 when "None" is selected or no configs available
      setSelectedConfigIndex(-1);
    }
  }, [allSimulationConfigs, simulationConfig, selectedConfigIndex, selectedSimType, onFullConfigChange, setSelectedSimType]);

  // Function to handle config selection from dropdown
  const handleConfigSelection = (configIndex: number) => {
    if (configIndex >= 0 && configIndex < allSimulationConfigs.length) {
      const selectedConfig = allSimulationConfigs[configIndex];
      if (selectedConfig) {
        setSelectedConfigIndex(configIndex);
        
        if (selectedConfig.type !== selectedSimType) {
          setSelectedSimType(selectedConfig.type);
        }
        
        onFullConfigChange(selectedConfig);
      }
    }
  };

  // Function to add a new config
  const addNewConfig = () => {
    if (selectedSimType === "None") {
      setIsAddingConfig(false);
      setNewConfigName("");
      return;
    }

    const defaultName = generateDefaultConfigName(selectedSimType, allSimulationConfigs);
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
        return;
    }

    const newConfigs = [...allSimulationConfigs, newConfig];
    setAllSimulationConfigs(newConfigs);
    setSelectedConfigIndex(newConfigs.length - 1);
    setIsAddingConfig(false);
    setNewConfigName("");
    
    onFullConfigChange(newConfig);
  };

  // Function to delete a config
  const deleteConfig = (configIndex: number) => {
    const newConfigs = allSimulationConfigs.filter(
      (_, index) => index !== configIndex
    );
    setAllSimulationConfigs(newConfigs);

    if (newConfigs.length === 0) {
      setSelectedConfigIndex(-1);
      setSelectedSimType("None");
      onStringConfigChange("");
      onFullConfigChange({ type: "None" });
    } else if (selectedConfigIndex === configIndex) {
      const newSelectedIndex = configIndex > 0 ? configIndex - 1 : 0;
      const newSelectedConfig = newConfigs[newSelectedIndex];
      if (newSelectedConfig) {
        setSelectedConfigIndex(newSelectedIndex);
        setSelectedSimType(newSelectedConfig.type);
        onFullConfigChange(newSelectedConfig);
      }
    } else if (selectedConfigIndex > configIndex) {
      setSelectedConfigIndex(selectedConfigIndex - 1);
    }
  };

  // Function to start editing a config name
  const startEditingConfigName = (configIndex: number) => {
    const config = allSimulationConfigs[configIndex];
    if (config && config.type !== "None" && "name" in config) {
      setEditingConfigIndex(configIndex);
      setEditingConfigName(config.name || "");
    }
  };

  // Function to save edited config name
  const saveEditedConfigName = () => {
    if (editingConfigIndex >= 0 && editingConfigName.trim()) {
      const updatedConfigs = allSimulationConfigs.map((config, index) => {
        if (index === editingConfigIndex && config.type !== "None") {
          return { ...config, name: editingConfigName.trim() };
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

  // Handler for simulation type changes
  const handleSimTypeChange = (newType: SimulationType["type"]) => {
    setSelectedSimType(newType);

    if (newType === "None") {
      setSelectedConfigIndex(-1);
      onStringConfigChange("");
      onFullConfigChange({ type: "None" });
      return;
    }

    // Look for existing configs of this type
    const existingConfigIndex = allSimulationConfigs.findIndex(
      (config) => config.type === newType && isConfigValid(config)
    );

    if (existingConfigIndex >= 0) {
      // Use existing valid config
      const existingConfig = allSimulationConfigs[existingConfigIndex];
      if (existingConfig) {
        setSelectedConfigIndex(existingConfigIndex);
        onFullConfigChange(existingConfig);
      }
    } else {
      // Create empty config for this type
      const defaultName = generateDefaultConfigName(newType, allSimulationConfigs);
      let emptyConfig: SimulationType;

      switch (newType) {
        case "DC":
          emptyConfig = {
            type: "DC",
            name: defaultName,
            source: "",
            start: "",
            stop: "",
            step: "",
          };
          break;
        case "AC":
          emptyConfig = {
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
          emptyConfig = {
            type: "Transient",
            name: defaultName,
            stopTime: "",
            timeStep: "",
          };
          break;
        default:
          emptyConfig = { type: "None" };
      }

      setSelectedConfigIndex(-1);
      onFullConfigChange(emptyConfig);
    }
  };

  // Handler for config changes from child components
  const handleFullConfigChange = (config: SimulationType) => {
    onFullConfigChange(config);

    // Save valid configs to the array
    if (isConfigValid(config) && selectedConfigIndex >= 0) {
      const updatedConfigs = allSimulationConfigs.map((item, index) =>
        index === selectedConfigIndex ? config : item
      );
      setAllSimulationConfigs(updatedConfigs);
    } else if (isConfigValid(config) && selectedConfigIndex === -1) {
      // Add new valid config
      const newConfigs = [...allSimulationConfigs, config];
      setAllSimulationConfigs(newConfigs);
      setSelectedConfigIndex(newConfigs.length - 1);
    }
  };

  const getCurrentConfig = () => {
    if (selectedConfigIndex >= 0 && selectedConfigIndex < allSimulationConfigs.length) {
      return allSimulationConfigs[selectedConfigIndex];
    }
    return null;
  };

  return (
    <Flex
      flexDirection="column"
      minWidth={{ base: "100%", md: "300px" }}
      maxWidth={{ base: "100%", md: "400px" }}
      height={{ base: "auto", md: "100%" }}
      overflow={{ base: "visible", md: "hidden" }}
      borderLeft={{ base: "none", md: "1px solid" }}
      borderTop={{ base: "1px solid", md: "none" }}
      position="relative"
    >
      <Box
        position={{ base: "static", md: "absolute" }}
        top={{ base: "auto", md: 0 }}
        left={{ base: "auto", md: 0 }}
        right={{ base: "auto", md: 0 }}
        bottom={{ base: "auto", md: 0 }}
        overflowY={{ base: "visible", md: "auto" }}
        overflowX="hidden"
        p={4}
        css={{
          overscrollBehavior: "contain",
          scrollbarWidth: "thin",
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
                      value={selectedConfigIndex >= 0 ? selectedConfigIndex.toString() : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "add-new") {
                          setIsAddingConfig(true);
                        } else if (value) {
                          handleConfigSelection(parseInt(value));
                        } else {
                          setSelectedConfigIndex(-1);
                          handleSimTypeChange(selectedSimType);
                        }
                      }}
                    >
                      <option value="">Select Configuration</option>
                      {allSimulationConfigs.map((config, index) => (
                        <option key={index} value={index.toString()}>
                          {config.type !== "None" && "name" in config && config.name
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
                        onClick={() => startEditingConfigName(selectedConfigIndex)}
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
              if (value.value && simType.includes(value.value as SimulationType["type"])) {
                handleSimTypeChange(value.value as SimulationType["type"]);
              }
            }}
          >
            <RadioCard.Label>Simulation Configuration</RadioCard.Label>
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

          {/* Config Components */}
          {(() => {
            const currentConfig = getCurrentConfig();
            
            switch (selectedSimType) {
              case "None":
                return <p>No addition to the netlist</p>;
              case "DC":
                return (
                  <DcConfig
                    onConfigChange={onStringConfigChange}
                    onFullConfigChange={handleFullConfigChange}
                    initialData={
                      currentConfig?.type === "DC" ? (currentConfig as SimulationDC) : undefined
                    }
                    netlist={netList}
                  />
                );
              case "AC":
                return (
                  <AcConfig
                    onConfigChange={onStringConfigChange}
                    onFullConfigChange={handleFullConfigChange}
                    initialData={
                      currentConfig?.type === "AC" ? (currentConfig as SimulationAC) : undefined
                    }
                    netlist={netList}
                  />
                );
              case "Transient":
                return (
                  <TransConfig
                    onConfigChange={onStringConfigChange}
                    onFullConfigChange={handleFullConfigChange}
                    initialData={
                      currentConfig?.type === "Transient" ? (currentConfig as SimulationTransient) : undefined
                    }
                  />
                );
              default:
                return null;
            }
          })()}
        </Flex>
      </Box>
    </Flex>
  );
};

export default SimulationConfigPanel;