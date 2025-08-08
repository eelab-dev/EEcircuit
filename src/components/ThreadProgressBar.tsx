import { Box, Flex, Text } from "@chakra-ui/react";
import React from "react";
import type { ThreadState } from "../store/simulationStore";

interface ThreadProgressBarProps {
  thread: ThreadState;
}

const ThreadProgressBar: React.FC<ThreadProgressBarProps> = ({ thread }) => {
  const progressPercentage =
    thread.totalAssignedSimulations > 0
      ? (thread.completedSimulations / thread.totalAssignedSimulations) * 100
      : 0;

  const getStatusColor = () => {
    if (thread.isCompleted) return "green.focusRing";
    if (thread.isRunning) return "blue.focusRing";
    return "gray.focusRing";
  };

  return (
    <Flex alignItems="center" gap="2" minHeight="20px">
      {/* Thread number */}
      <Text fontSize="xs" color="fg.muted" minWidth="4" textAlign="center">
        {thread.threadId}
      </Text>

      {/* Progress bar */}
      <Box
        flex="1"
        bg="gray.200"
        borderRadius="full"
        overflow="hidden"
        height="1.5"
      >
        <Box
          bg={getStatusColor()}
          height="100%"
          width={`${progressPercentage}%`}
          transition="width 0.3s ease"
        />
      </Box>

      {/* Progress count */}
      <Text fontSize="xs" color="fg.muted" minWidth="10" textAlign="right">
        {thread.completedSimulations}/{thread.totalAssignedSimulations}
      </Text>
    </Flex>
  );
};

export default ThreadProgressBar;
