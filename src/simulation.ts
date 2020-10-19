/**
 * SPICE simulation
 */
import * as circuits from "./circuits";
import Module from "./spice";

import readOutput from "./readOutput";
import { printCSV, printDisplay } from "./printOutput";

export default class Simulation {
  private pass = false;
  //const commandList = [" ", "source test.cir", "run", "set filetype=ascii", "write out.raw"];
  private commandList = [" ", "source test.cir", "run", "write out.raw"];
  private cmd = 0;
  private dataRaw: Uint8Array;
  private dataArray: number[][];
  private output = "";

  private netList = "";

  private getInput = (): string => {
    let strCmd = " ";
    if (this.cmd < this.commandList.length) {
      strCmd = this.commandList[this.cmd];
      this.cmd++;
    } else {
      this.cmd = 0;
    }
    console.log(`cmd -> ${strCmd}`);
    return strCmd;
  };

  public async start(): Promise<void> {
    const module = await Module({
      //arguments: ["test.cir"],
      noInitialRun: true,
      print: () => {
        /*do nothing*/
      },
      preRun: [
        () => {
          console.log("from prerun");
        },
      ],
    });

    module.FS.writeFile("/proc/meminfo", "");
    module.FS.writeFile("/modelcard.nmos", circuits.strModelNmos);
    module.FS.writeFile("/modelcard.pmos", circuits.strModelPmos);
    //console.log(module.Asyncify);

    module.setHandleThings(() => {
      console.log("handle other things!!!!!");
      module.Asyncify.handleAsync(async () => {
        console.log(this.pass);
        if (this.cmd == 0) {
          try {
            this.dataRaw = module.FS.readFile("out.raw");
            this.dataArray = readOutput(this.dataRaw).data;
            this.outputEvent(this.output); //callback
          } catch (e) {
            console.log("no file!");
          }

          console.log("cmd-> ready to start...");
          //pass = false;
        }
        while (!this.pass && this.cmd == 0) {
          //console.log(chkPass());
          await new Promise((r) => setTimeout(r, 1000));
          console.log(`I am in pass loop JS -${this.pass} `);
        }
        module.FS.writeFile("/test.cir", this.netList);

        console.log("loop finished");

        this.pass = false;
      });
    });
    module.setGetInput(this.getInput);

    module.runThings();
  }

  public runSim(): void {
    this.pass = true;
  }

  public getOutputCSV = (): string => {
    return printCSV(this.dataArray);
  };

  public getOutputDisplay = (): string => {
    return printDisplay(this.dataArray);
  };

  private outputEvent: (out: string) => void;

  public setNetList = (input: string): void => {
    this.netList = input;
  };

  public setOutputEvent = (outputEvent: (out: string) => void): void => {
    this.outputEvent = outputEvent;
  };
  public getOutputNumerical = (): number[][] => {
    return this.dataArray;
  };
}
