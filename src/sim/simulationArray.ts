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
  sim1: ComLink.Remote<typeof simulation>;
  sim2: ComLink.Remote<typeof simulation>;
  private netLists = [] as string[];
  private parserResult: ParserType | null;
  private inputNetList = "";
  private results: ResultType[];
  private sweep: number[];

  constructor() {
    this.results = [];
    this.sweep = [];
    this.parserResult = null;
    const worker1 = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    const worker2 = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    this.sim1 = ComLink.wrap<typeof simulation>(worker1);
    this.sim2 = ComLink.wrap<typeof simulation>(worker2);
    //this.init();
  }

  public async init(): Promise<void> {
    //this.sim = null;
    //this.sim.setOutputEvent(ComLink.proxy(simOutputCallback));
    await this.sim1.start();
    await this.sim2.start();
    //const initialSimInfo = await this.sim.getInfo();
    this.log("☀️", await this.sim1.getInfo());
    //this.log("☀️", await this.sim2.getInfo());
    this.log("🧨🧨🧨🧨🧨🧨🧨🧨");
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  public async runSim(): Promise<ResultArrayType> {
    this.parserResult = parser(this.inputNetList);
    this.netLists = this.parserResult.netLists;
    this.sweep = this.parserResult.sweep;

    this.results = [];

    let error = false;

    for (let i = 0; i < this.netLists.length && !error; i += 2) {
      this.sim1.setNetList(this.netLists[i]);
      this.sim2.setNetList(this.netLists[i + 1]);
      const PSim1 = this.sim1.runSimP();
      const PSim2 = this.sim2.runSimP();
      //
      await Promise.all([PSim1, PSim2]);
      this.log("👌👌👌");
      const err = await this.sim1.getError(); //???????
      if (err.length > 0) error = true;
      this.results.push(await this.sim1.getResults());
      this.results.push(await this.sim2.getResults());

      this.progressCallback((100 * i) / (this.netLists.length - 1));
    }

    //this.simArrayOutputCallback();

    return { results: this.results, sweep: this.sweep };
  }

  public setNetList(text: string) {
    this.inputNetList = text;
  }

  public async getInfo(): Promise<string> {
    return await this.sim1.getInfo();
  }

  public async getInitInfo(): Promise<string> {
    return await this.sim1.getInitInfo();
  }

  public async getError(): Promise<string[]> {
    return await this.sim1.getError();
  }

  public getResults(): ResultArrayType {
    return { results: this.results, sweep: this.sweep };
  }

  public progressCallback(n: number) {}

  private log(message?: any, ...optionalParams: any[]): void {
    console.log("simArray -> ", message, optionalParams);
  }
}

export const isComplex = (ra: ResultArrayType): boolean => {
  return ra.results[0].param.dataType == "complex";
};
