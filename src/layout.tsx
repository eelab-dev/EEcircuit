import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import React from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout: React.FC = () => {
  return (
    <ChakraProvider value={defaultSystem}>
      <EEcircuit />
    </ChakraProvider>
  );
};

export default Layout;
