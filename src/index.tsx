import React from "react";
import ReactDOM from "react-dom";
//import App from './App';
import Layout from "./layout";
//import "./index.css";

ReactDOM.render(
  <Layout />,

  document.getElementById("root")
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot?.accept(({ module }) => {});
}
