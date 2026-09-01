import { mount } from "svelte";
import App from "./App.svelte";
import "./styles/global.css";

const target = document.getElementById("root");

if (!target) {
  throw new Error("EEcircuit root element was not found");
}

mount(App, { target });
