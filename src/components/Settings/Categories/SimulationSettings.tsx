import React from "react";
import { Flex, Input, Text } from "@chakra-ui/react";

interface SimulationSettingsProps {
  tempMaxWorkers: number;
  setTempMaxWorkers: (value: number) => void;
}

const SimulationSettings: React.FC<SimulationSettingsProps> = ({
  tempMaxWorkers,
  setTempMaxWorkers,
}) => {
  const maxPossibleWorkers = navigator.hardwareConcurrency || 8;

  const handleWorkerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTempMaxWorkers(value);
    }
  };

  return (
    <Flex flexDirection="column" gap="4">
      <Flex flexDirection="column" gap="2">
        <Text fontSize="sm" fontWeight="medium">
          Maximum Parallel Web Workers
        </Text>
        <Text fontSize="xs" color="fg.muted">
          Number of parallel threads for bracket operations. Higher values may
          improve performance but use more system resources.
        </Text>
        <Flex alignItems="center" gap="2">
          <Input
            type="number"
            value={tempMaxWorkers}
            onChange={handleWorkerCountChange}
            min={1}
            max={maxPossibleWorkers}
            width="80px"
            size="sm"
          />
          <Text fontSize="xs" color="fg.muted">
            (max: {maxPossibleWorkers} based on your system)
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SimulationSettings;
