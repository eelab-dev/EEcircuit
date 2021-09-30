import { ChakraProvider, extendTheme, ThemeConfig } from "@chakra-ui/react";
import React from "react";
import EEsim from "./EEsim";
//import App from './App';
//import EEsim from "./EEsim";

const Layout = (): JSX.Element => {
  const config: ThemeConfig = {
    initialColorMode: "dark",
    useSystemColorMode: false,
  };

  const customTheme = extendTheme({ config });

  return (
    <div>
      <ChakraProvider theme={customTheme}>
        <EEsim />
      </ChakraProvider>
    </div>
  );
};

export default Layout;
