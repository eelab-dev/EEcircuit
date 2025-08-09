import { Box, Flex, Text } from "@chakra-ui/react";
import React from "react";
import { useAppStore } from "../store/appStore";
import ThreadProgressBar from "./ThreadProgressBar";

const PlotProgressOverlay: React.FC = () => {
  const isParallelSimulationRunning = useAppStore(
    (state) => state.isParallelSimulationRunning
  );
  const parallelSimulationProgress = useAppStore(
    (state) => state.parallelSimulationProgress
  );
  const bracketOperation = useAppStore((state) => state.bracketOperation);

  if (!isParallelSimulationRunning) {
    return null;
  }

  return (
    <Box
      position="absolute"
      bottom="4"
      right="4"
      bg="bg.panel"
      borderRadius="md"
      border="1px solid"
      borderColor="border.default"
      p="3"
      minW="280px"
      maxW="320px"
      boxShadow="lg"
      backdropFilter="blur(8px)"
      zIndex={20}
    >
      <Flex flexDirection="column" gap="2">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" fontWeight="medium" color="fg.default">
            Parallel Simulation
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {parallelSimulationProgress.completed}/
            {parallelSimulationProgress.total}
          </Text>
        </Flex>

        {/* Bracket operation info */}
        {bracketOperation && (
          <Text fontSize="xs" color="fg.muted">
            [{bracketOperation.start}:{bracketOperation.step}:
            {bracketOperation.stop}]
            {bracketOperation.unit && bracketOperation.unit}
          </Text>
        )}

        {/* Overall progress bar */}
        <Box
          bg="gray.muted/70"
          borderRadius="full"
          overflow="hidden"
          height="2"
        >
          <Box
            bg="blue.focusRing/70"
            height="100%"
            width={`${(parallelSimulationProgress.completed / Math.max(parallelSimulationProgress.total, 1)) * 100}%`}
            transition="width 0.3s ease"
          />
        </Box>

        {/* Thread progress bars */}
        {parallelSimulationProgress.threads.length > 0 && (
          <Flex flexDirection="column" gap="1">
            <Text fontSize="xs" color="fg.muted">
              Threads:
            </Text>
            {parallelSimulationProgress.threads.map((thread) => (
              <ThreadProgressBar key={thread.threadId} thread={thread} />
            ))}
          </Flex>
        )}

        {/* Success/failure summary */}
        <Flex justifyContent="space-between" fontSize="xs" color="fg.muted">
          <Text>✓ {parallelSimulationProgress.successful} successful</Text>
          <Text>✗ {parallelSimulationProgress.failed} failed</Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default PlotProgressOverlay;
