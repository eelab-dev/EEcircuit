import { Simulation } from "eecircuit-engine";

import * as ComLink from "comlink";

export const simulation = new Simulation();

ComLink.expose(simulation);
