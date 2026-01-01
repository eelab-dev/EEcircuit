import React from "react";
import { Flex, Button, Text } from "@chakra-ui/react";

const GeneralSettings: React.FC = () => {
  const handleClearLocalStorage = () => {
    // Confirm before clearing? The user asked for a button, usually a confirmation is good UX.
    // But for now, as per plan, direct action with reload.
    if (window.confirm("Are you sure you want to clear all local storage? This will reset all application settings and data.")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  return (
    <Flex flexDirection="column" gap="4">
      <Flex flexDirection="column" gap="2">
        <Text fontSize="sm" fontWeight="medium">
          Data Management
        </Text>
        <Text fontSize="xs" color="fg.muted">
          Clear all local data stored by the application. This includes saved settings and simulation states.
        </Text>
        <Button
            size="sm"
            colorPalette="red"
            variant="outline"
            onClick={handleClearLocalStorage}
            width="fit-content"
        >
          Clear Local Storage
        </Button>
      </Flex>
    </Flex>
  );
};

export default GeneralSettings;
