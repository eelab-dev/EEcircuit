/**
 *
 *
 */

import type { simulation } from "./simulationLink";
import { parser } from "./parser";
import type { ResultType } from "./readOutput";

import * as ComLink from "comlink";
import type { ParserType } from "./parser";

export type ResultArrayType = {
  results: ResultType[];
  sweep: number[];
};

export class SimArray {
  sim: ComLink.Remote<typeof simulation>;
  private netLists = [] as string[];
  private parserResult: ParserType | null;
  private inputNetList = "";
  private results: ResultType[];
  private sweep: number[];

  constructor() {
    const worker = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    this.sim = ComLink.wrap<typeof simulation>(worker);
    //this.sim = null;
    this.results = [];
    this.sweep = [];
    this.parserResult = null;
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

  public async runSim(): Promise<ResultArrayType> {
    this.parserResult = parser(this.inputNetList);
    this.netLists = this.parserResult.netLists;
    this.sweep = this.parserResult.sweep;

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
      const wait = i == this.netLists.length - 1 ? true : false;
      await this.sim.runSimP(wait);
      this.results.push(await this.sim.getResults());
      console.log("👌👌👌");
    }

    //this.simArrayOutputCallback();

    return { results: this.results, sweep: this.sweep };
  }

  public setNetList(text: string) {
    this.inputNetList = text;
  }
  /*public getResults(): ResultTypeArray | null {
    console.log("----->", this.results);
    return { results: this.results, sweep: this.sweep };
  }*/

  //public simArrayOutputCallback() {}
}
