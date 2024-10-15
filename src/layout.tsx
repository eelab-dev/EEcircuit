import { ChakraProvider, extendTheme, ThemeConfig } from "@chakra-ui/react";
import React, { JSX } from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout = (): JSX.Element => {
  const config: ThemeConfig = {
    initialColorMode: "dark",
    useSystemColorMode: false,
  };

  const customTheme = extendTheme({ config });

  return (
    <div>
      <ChakraProvider theme={customTheme}>
        <EEcircuit />
      </ChakraProvider>
    </div>
  );
};

export default Layout;
