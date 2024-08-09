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
  private progress = 0;

  constructor() {
    this.results = [];
    this.sweep = [];
    this.parserResult = null;
    this.simArray = [];
    this.threads = 1;
  }

  public async init(threadCount: number): Promise<void> {
    this.results = [];
    this.sweep = [];
    this.parserResult = null;
    this.simArray = [];
    this.threads = threadCount;
    for (let i = 0; i < this.threads; i++) {
      const worker = new Worker(new URL("./simulationLink.ts", import.meta.url), {
        type: "module",
      });
      const sim = ComLink.wrap<typeof simulation>(worker);
      this.simArray.push(sim);
    }
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
    this.progress = 0;
    this.parserResult = parser(this.inputNetList);
    this.sweep = this.parserResult.sweep;
    this.netLists = this.parserResult.netLists;
    const netListsDist = distNetList(this.netLists, this.threads);

    this.results = [];

    this.error = false;

    let threadPromises = [] as Promise<ResultType[]>[];

    for (let i = 0; i < netListsDist.length; i++) {
      const singleThreadPromise = this.runSimSingleThread(this.simArray[i], netListsDist[i]);
      threadPromises.push(singleThreadPromise);
    }
    const threadResults = await Promise.all(threadPromises);
    for (const result of threadResults) {
      this.results = this.results.concat(result);
    }
    //this.log("Final", this.results);
    if (!this.error) {
      console.log("Simulation run completed successfully!");
    }
    else {
      console.error("Simulation run completed with errors!");
    }

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
      this.progress++;
      this.progressCallback((100 * this.progress) / this.netLists.length);
    }
    this.log("👌👌👌");
    //this.log(results);
    return results;
  }

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

  public progressCallback(n: number) { }

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
