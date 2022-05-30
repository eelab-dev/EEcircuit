import React from "react";
//import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import Layout from "./layout";

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<Layout />);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot?.accept(({ module }) => {});
}
