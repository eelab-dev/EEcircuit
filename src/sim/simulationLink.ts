/**
 * SPICE simulation
 */
import * as Comlink from "comlink";

import * as circuits from "./circuits";
import * as freePDK45 from "./models/freepdk/freePDK";
import * as ptm from "./models/ptm";
import * as skyWater from "./models/skywater/models";
import Module from "./spice";

import readOutput, { ResultType } from "./readOutput";

//export { ResultType };

export class Simulation {
  private pass = false;
  //const commandList = [" ", "source test.cir", "run", "set filetype=ascii", "write out.raw"];
  private commandList = [" ", "source test.cir", "run", "write out.raw"];
  private cmd = 0;
  private dataRaw = new Uint8Array();
  private results = {} as ResultType;
  private output = "";
  private info = "";
  private error = [] as string[];
  public initialized = false;

  private netList = "";

  private resolve = () => {};
  private resolveWait = () => {};
  private resolveInit = () => {};
  private wait = true;

  private getInput = (): string => {
    let strCmd = " ";
    if (this.cmd < this.commandList.length) {
      strCmd = this.commandList[this.cmd];
      this.cmd++;
    } else {
      this.cmd = 0;
    }
    this.log(`cmd -> ${strCmd}`);
    return strCmd;
  };

  public async start2() {
    const module = await Module({
      //arguments: ["test.cir"],
      noInitialRun: true,
      print: (e) => {
        /*do nothing*/
        this.log(e);
        this.info += e + "\n";
      },
      printErr: (e) => {
        console.error(e);
        this.info += e + "\n\n";
        if (e != "Note: can't find init file.") {
          this.error.push(e);
        }
      },
      preRun: [
        () => {
          this.log("from prerun");
        },
      ],
      setGetInput: this.getInput,
      setHandleThings: () => {
        /** */
      },
      runThings: () => {
        /** */
      },
    });
    module.FS?.writeFile("/spinit", "* Standard ngspice init file\n");
    module.FS?.writeFile("/proc/meminfo", "");
    module.FS?.writeFile("/modelcard.FreePDK45", freePDK45.PDK45);
    module.FS?.writeFile("/modelcard.PDK15", freePDK45.PDK15);
    module.FS?.writeFile("/modelcard.ptmLP", ptm.ptmLP);
    module.FS?.writeFile("/modelcard.ptmHP", ptm.ptmHP);
    module.FS?.writeFile("/modelcard.ptm", ptm.ptm);
    module.FS?.writeFile("/modelcard.skywater", skyWater.models);
    module.FS?.writeFile("/modelcard.CMOS90", circuits.strModelCMOS90);
    //module.FS.writeFile("/test.cir", circuits.bsimTrans);
    console.log("init");

    module.setHandleThings(() => {
      this.log("handle other things!!!!!");
      module.Asyncify?.handleAsync(async () => {
        this.log(this.pass);
        if (this.cmd == 0) {
          try {
            this.dataRaw = module.FS?.readFile("out.raw") ?? new Uint8Array();
            this.results = readOutput(this.dataRaw);
            this.outputEvent(this.output); //callback
            this.resolve();
          } catch (e) {
            this.log(e);
          }

          this.log("output completed");
          //pass = false;
        }

        if (!this.initialized) {
          this.resolveInit();
          this.log("initialized");
          this.initialized = true;
        }

        if (this.cmd == 0) {
          this.log("waiting...");
          await this.waitSim();
        }
        this.log("🥳🥳", "resolveWait2");

        /*while (!this.pass && this.cmd == 0) {
          //console.log(chkPass());
          const time = this.wait || this.error.length > 0 ? 1000 : 0.001;
          await new Promise((r) => setTimeout(r, time));
          this.log(`I am in pass loop JS -${this.pass} `);
        }*/
        module.FS?.writeFile("/test.cir", this.netList);

        this.log("loop finished");

        this.pass = false;
      });
    });

    module.setGetInput(this.getInput);

    module.runThings();
  }

  public start = (): Promise<void> => {
    this.start2();
    return new Promise<void>((resolve, reject) => {
      this.resolveInit = resolve;
    });
  };

  // https://mitya.uk/articles/resolving-es6-promises-outside
  public runSimP = (wait: boolean): Promise<void> => {
    this.info = "";
    this.error = [] as string[];
    this.results = {} as ResultType;
    this.wait = wait;
    this.log("🥳", "resolveWait");
    this.resolveWait();
    this.pass = true;
    return new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
    });
  };

  private waitSim = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.resolveWait = resolve;
    });
  };

  /*public runSim(): void {
    this.info = "";
    this.error = [] as string[];
    this.results = {} as ResultType;
    this.pass = true;
  }*/

  //private outputEvent =  (out: string) => void;
  private outputEvent = (out: string) => {
    /** */
  };

  public setNetList = (input: string): void => {
    this.netList = input;
  };

  public setOutputEvent = (outputEvent: (out: string) => void): void => {
    this.outputEvent = outputEvent;
  };
  public getResults = (): ResultType => {
    return this.results;
  };
  public getInfo = (): string => {
    return this.info;
  };
  public getError = (): string[] => {
    return this.error;
  };
  private log = (message?: any, ...optionalParams: any[]) => {
    console.log("simLink-> ", message, optionalParams);
  };
}

export const simulation = new Simulation();
Comlink.expose(simulation);
