/**
 *
 *
 */

import type { simulation } from "./simulationLink";
import { parser } from "./parser";
import type { ResultType } from "./readOutput";

import * as ComLink from "comlink";

export class SimArray {
  sim: ComLink.Remote<typeof simulation>;
  private netList = "";
  private inputNetList = "";
  private results: ResultType | null;

  constructor() {
    const worker = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    this.sim = ComLink.wrap<typeof simulation>(worker);
    //this.sim = null;
    this.results = null;
    this.init();
  }

  private async init() {
    const simOutputCallback = async () => {
      this.results = await this.sim.getResults();
      this.simArrayOutputCallback();
    };

    await this.sim.setOutputEvent(ComLink.proxy(simOutputCallback));
    await this.sim.start();
    const initialSimInfo = await this.sim.getInfo();
    console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
  }

  public async runSim() {
    if (this.sim) {
      const netLists = parser(this.inputNetList);
      await this.sim.setNetList(netLists[0]);
      await this.sim.runSim();
    } else {
      //should not happen
    }
  }
  public setNetList(text: string) {
    this.inputNetList = text;
  }
  public getResults(): ResultType | null {
    return this.results;
  }

  public simArrayOutputCallback() {}
}
