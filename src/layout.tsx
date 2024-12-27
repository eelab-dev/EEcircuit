import { ChakraProvider, extendTheme, ThemeConfig } from "@chakra-ui/react";
import React, { JSX } from "react";
import EEcircuit from "./EEcircuit";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

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
      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default Layout;
