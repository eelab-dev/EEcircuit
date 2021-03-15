import React from "react";
import ReactDOM from "react-dom";
//import App from './App';
import EEsim from "./EEsim";
//import "./index.css";

ReactDOM.render(
  <EEsim />,

  document.getElementById("root")
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot?.accept(({ module }) => {});
}
