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
  private netLists = [] as string[];
  private inputNetList = "";
  private results: ResultType[];
  private block = false;

  constructor() {
    const worker = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    this.sim = ComLink.wrap<typeof simulation>(worker);
    //this.sim = null;
    this.results = [];
    this.init();
  }

  private async init() {
    const simOutputCallback = async () => {
      //this.results.push(await this.sim.getResults());
      //this.block = false;
      console.log("👌");
      //this.check();
    };

    //this.sim.setOutputEvent(ComLink.proxy(simOutputCallback));
    this.sim.start();
    //const initialSimInfo = await this.sim.getInfo();
    console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
  }

  public async runSim() {
    this.netLists = parser(this.inputNetList);

    /*this.sim.setNetList(this.netLists[0]);
    console.log("📚", this.netLists);
    await this.sim.runSimP();
    this.results.push(await this.sim.getResults());
    console.log("👌👌");

    this.sim.setNetList(this.netLists[5]);
    await this.sim.runSimP();
    this.results.push(await this.sim.getResults());
    console.log("👌👌👌");
    //this.block = false;*/

    for (let i = 0; i < this.netLists.length; i++) {
      this.sim.setNetList(this.netLists[i]);
      await this.sim.runSimP();
      this.results.push(await this.sim.getResults());
      console.log("👌👌👌");
    }

    this.simArrayOutputCallback();
  }

  public setNetList(text: string) {
    this.inputNetList = text;
  }
  public getResults(): ResultType[] | null {
    console.log("----->", this.results);
    return this.results;
  }

  public simArrayOutputCallback() {}
}
