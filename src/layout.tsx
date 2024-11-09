import { Provider } from "./components/ui/provider.tsx"

import React, { JSX } from "react";
import EEcircuit from "./EEcircuit.tsx";

const Layout = (): JSX.Element => {
  

  return (
    <div>
      <Provider>
        <EEcircuit />
      </Provider>
    </div>
  );
};

export default Layout;
