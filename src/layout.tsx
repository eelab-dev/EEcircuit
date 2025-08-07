import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
//import { Analytics } from "@vercel/analytics/react";
//import { SpeedInsights } from "@vercel/speed-insights/react";

import React from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout: React.FC = () => {
  return (
    <ChakraProvider value={defaultSystem}>
      {/*<Analytics />
        <SpeedInsights />*/}
      <EEcircuit />
    </ChakraProvider>
  );
};

export default Layout;
