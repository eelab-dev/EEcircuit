import React from "react";
import { Flex, Button } from "@chakra-ui/react";
import { Activity, Settings2, Settings } from "lucide-react";

import { SettingsCategory } from "../../types/commonTypes";

interface SettingsSidebarProps {
  activeCategory: SettingsCategory;
  setActiveCategory: (category: SettingsCategory) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeCategory,
  setActiveCategory,
}) => {
  return (
    <Flex
      direction="column"
      gap={2}
      p={2}
      borderRightWidth="1px"
      borderColor="border.muted"
      width="100%"
      height="100%"
      bg="bg.subtle"
    >
      <Button
        variant={activeCategory === "general" ? "subtle" : "ghost"}
        justifyContent="flex-start"
        onClick={() => setActiveCategory("general")}
        size="sm"
        width="100%"
        aria-label="General Settings"
      >
        <Settings size={16} style={{ marginRight: "8px" }} />
        General
      </Button>
      <Button
        variant={activeCategory === "simulation" ? "subtle" : "ghost"}
        justifyContent="flex-start"
        onClick={() => setActiveCategory("simulation")}
        size="sm"
        width="100%"
        aria-label="Simulation Settings"
      >
        <Activity size={16} style={{ marginRight: "8px" }} />
        Simulation
      </Button>
      <Button
        variant={activeCategory === "plotting" ? "subtle" : "ghost"}
        justifyContent="flex-start"
        onClick={() => setActiveCategory("plotting")}
        size="sm"
        width="100%"
        aria-label="Plotting Settings"
      >
        <Settings2 size={16} style={{ marginRight: "8px" }} />
        Plotting
      </Button>
    </Flex>
  );
};

export default SettingsSidebar;
