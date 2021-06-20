/**
 *
 *
 */

import type { Simulation, simulation } from "./simulationLink";
import { parser } from "./parser";
import type { ResultType } from "./readOutput";

import * as ComLink from "comlink";
import type { ParserType } from "./parser";

export type ResultArrayType = {
  results: ResultType[];
  sweep: number[];
};

export class SimArray {
  private simArray: ComLink.Remote<typeof simulation>[];
  //sim2: ComLink.Remote<typeof simulation>;
  private netLists = [] as string[];
  private parserResult: ParserType | null;
  private inputNetList = "";
  private results: ResultType[];
  private sweep: number[];
  private threads: number;
  private error = false;
  private prog = 0;

  constructor() {
    this.results = [];
    this.sweep = [];
    this.parserResult = null;
    this.simArray = [];
    this.threads = 6;

    for (let i = 0; i < this.threads; i++) {
      const worker = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
      const sim = ComLink.wrap<typeof simulation>(worker);
      this.simArray.push(sim);
    }

    //const worker2 = new Worker("/_dist_/sim/simulationLink.js", { type: "module" });
    //this.sim2 = ComLink.wrap<typeof simulation>(worker2);
    //this.init();
  }

  public async init(): Promise<void> {
    //https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
    for (const sim of this.simArray) {
      await sim.start();
    }
    //await this.simArray[0].start();
    //await this.simArray[1].start();
    //const initialSimInfo = await this.sim.getInfo();
    this.log("☀️", await this.simArray[0].getInfo());
    //this.log("☀️", await this.sim2.getInfo());
    this.log("🧨🧨🧨🧨🧨🧨🧨🧨");
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  public async runSim(): Promise<ResultArrayType> {
    this.parserResult = parser(this.inputNetList);
    this.sweep = this.parserResult.sweep;
    this.netLists = this.parserResult.netLists;
    const netListsDist = distNetList(this.netLists, this.threads);

    this.results = [];

    //let error = false;

    let threadPromises = [] as Promise<ResultType[]>[];

    for (let i = 0; i < netListsDist.length; i++) {
      const singleThreadPromise = this.runSimSingleThread(this.simArray[i], netListsDist[i]);
      threadPromises.push(singleThreadPromise);
      this.progressCallback((100 * this.results.length) / (this.netLists.length - 1)); //????????????????
    }
    const threadResults = await Promise.all(threadPromises);
    for (const result of threadResults) {
      this.results = this.results.concat(result);
    }
    //this.log("Final", this.results);

    return { results: this.results, sweep: this.sweep };
  }

  private async runSimSingleThread(
    sim: ComLink.Remote<Simulation>,
    netLists: string[]
  ): Promise<ResultType[]> {
    const results = [] as ResultType[];
    for (const netList of netLists) {
      sim.setNetList(netList);
      await sim.runSimP();
      const err = await sim.getError();
      if (err.length > 0 || this.error) {
        this.error = true;
        break;
      }
      const result = await sim.getResult();
      results.push(result);
      this.prog++;
      this.progressCallback((100 * this.prog) / this.netLists.length); //????????????????
    }
    this.log("👌👌👌");
    //this.log(results);
    return results;
  }

  /*public async runSim(): Promise<ResultArrayType> {
    //
    this.parserResult = parser(this.inputNetList);
    this.netLists = this.parserResult.netLists;
    this.sweep = this.parserResult.sweep;

    this.results = [];

    let error = false;

    distNetList(this.netLists, 3);

    for (let i = 0; i < this.netLists.length && !error; i += 2) {
      this.simArray[0].setNetList(this.netLists[i]);
      this.simArray[1].setNetList(this.netLists[i + 1]);

      const PSim = [] as Promise<void>[];
      for (const sim of this.simArray) {
        const pSim = sim.runSimP();
        PSim.push(pSim);
      }
      await Promise.all(PSim);
      this.log("👌👌👌");
      const err = await this.simArray[0].getError(); //???????
      if (err.length > 0) error = true;

      for (const sim of this.simArray) {
        this.results.push(await sim.getResults());
      }

      this.progressCallback((100 * i) / (this.netLists.length - 1));
    }

    //this.simArrayOutputCallback();

    return { results: this.results, sweep: this.sweep };
  }*/

  public setNetList(text: string) {
    this.inputNetList = text;
  }

  public async getInfo(): Promise<string> {
    return await this.simArray[0].getInfo();
  }

  public async getInitInfo(): Promise<string> {
    return await this.simArray[0].getInitInfo();
  }

  public async getError(): Promise<string[]> {
    return await this.simArray[0].getError();
  }

  public getResults(): ResultArrayType {
    return { results: this.results, sweep: this.sweep };
  }

  public progressCallback(n: number) {}

  private log(message?: any, ...optionalParams: any[]): void {
    //console.log("simArray -> ", message, optionalParams);
  }
}

export const isComplex = (ra: ResultArrayType): boolean => {
  return ra.results[0].param.dataType == "complex";
};

//https://codesandbox.io/s/netlist-23m16?file=/src/index.ts
const distNetList = (inputNetLists: string[], threads: number): string[][] => {
  const outNetList = [] as string[][];
  let thread = 0;
  let i = 0;
  while (i < inputNetLists.length) {
    const netListsPerThread = [] as string[];
    while (thread < inputNetLists.length / threads && i < inputNetLists.length) {
      netListsPerThread.push(inputNetLists[i]);
      thread++;
      i++;
    }
    outNetList.push(netListsPerThread);
    thread = 0;
  }

  return outNetList;
};
