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
    //this.sim.setOutputEvent(ComLink.proxy(simOutputCallback));
    await this.sim.start();
    //const initialSimInfo = await this.sim.getInfo();
    console.log("☀️", await this.sim.getInfo());
    console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
  }

  public async runSim(): Promise<ResultArrayType> {
    this.parserResult = parser(this.inputNetList);
    this.netLists = this.parserResult.netLists;
    this.sweep = this.parserResult.sweep;

    this.results = [];

    let error = false;

    for (let i = 0; i < this.netLists.length && !error; i++) {
      this.sim.setNetList(this.netLists[i]);
      const wait = i == this.netLists.length - 1 ? true : false;
      await this.sim.runSimP(wait);
      const err = await this.sim.getError();
      if (err.length > 0) error = true;
      this.results.push(await this.sim.getResults());
      console.log("👌👌👌");
      this.progressCallback((100 * i) / (this.netLists.length - 1));
    }

    //this.simArrayOutputCallback();

    return { results: this.results, sweep: this.sweep };
  }

  public setNetList(text: string) {
    this.inputNetList = text;
  }

  public async getInfo(): Promise<string> {
    return await this.sim.getInfo();
  }

  public async getError(): Promise<string[]> {
    return await this.sim.getError();
  }

  public progressCallback(n: number) {}
}
