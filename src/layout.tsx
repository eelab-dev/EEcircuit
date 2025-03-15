//import { Provider } from "./components/ui/provider.tsx"
import { ColorModeProvider } from "./components/ui/color-mode"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"

import React, { JSX } from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout = (): JSX.Element => {
  

  return (
    <div>
      <ChakraProvider value={defaultSystem}>
      <ColorModeProvider>
        <EEcircuit />
      </ColorModeProvider>
    </ChakraProvider>
    </div>
  );
};

export default Layout;
