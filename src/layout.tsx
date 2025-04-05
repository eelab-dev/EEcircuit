//import { Provider } from "./components/ui/provider.tsx"
import { ColorModeProvider } from "./components/ui/color-mode.tsx";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
//import { Analytics } from "@vercel/analytics/react";
//import { SpeedInsights } from "@vercel/speed-insights/react";

import React from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout: React.FC = () => {
  return (
    <div>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider>
          {/*<Analytics />
          <SpeedInsights />*/}
          <EEcircuit />
        </ColorModeProvider>
      </ChakraProvider>
    </div>
  );
};

export default Layout;
