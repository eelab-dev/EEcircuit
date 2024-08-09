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
  private initInfo = "";
  private error = [] as string[];
  private initialized = false;

  private netList = "";

  private resolve = () => { };
  private resolveWait = () => { };
  private resolveInit = () => { };

  private getInput = (): string => {
    let strCmd = " ";
    if (this.cmd < this.commandList.length) {
      strCmd = this.commandList[this.cmd];
      this.cmd++;
    } else {
      this.cmd = 0;
    }
    this.log_debug(`cmd -> ${strCmd}`);
    return strCmd;
  };

  private async start2() {
    const module = await Module({
      //arguments: ["test.cir"],
      noInitialRun: true,
      print: (e) => {
        /*do nothing*/
        this.log_debug(e);
        this.info += e + "\n";
      },

      // https://sourceforge.net/p/ngspice/discussion/127605/thread/120f3462f9/
      printErr: (e) => {
        this.info += e + "\n\n";
        if (e != "Warning: can't find the initialization file spinit." && e !== "Using SPARSE 1.3 as Direct Linear Solver") {
          console.error(e);
          this.error.push(e);
        }
        else {
          console.log(e);
        }
      },
      preRun: [
        () => {
          this.log_debug("from prerun");
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
      this.log_debug("handle other things!!!!!");
      module.Asyncify?.handleAsync(async () => {
        this.log_debug(this.pass);
        if (this.cmd == 0) {
          try {
            this.dataRaw = module.FS?.readFile("out.raw") ?? new Uint8Array();
            this.results = readOutput(this.dataRaw);
            this.outputEvent(this.output); //callback
            this.resolve();
          } catch (e) {
            this.log_debug(e);
          }

          this.log_debug("output completed");
          //pass = false;
        }

        if (!this.initialized) {
          this.resolveInit();
          this.log_debug("initialized");
          this.initialized = true;
          this.initInfo = this.info;
        }

        if (this.cmd == 0) {
          this.log_debug("waiting...");
          await this.waitSimResolve();
        }
        this.log_debug("🥳🥳", "resolveWait2");

        module.FS?.writeFile("/test.cir", this.netList);

        this.log_debug("loop finished");

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
  public runSimP = (): Promise<void> => {
    if (this.initialized) {
      this.info = "";
      this.error = [] as string[];
      this.results = {} as ResultType;
      this.log_debug("🥳", "resolveWait");
      this.resolveWait();
    }
    return new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
    });
  };

  private waitSimResolve = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.resolveWait = resolve;
    });
  };

  private outputEvent = (out: string) => {
    /** */
  };

  public setNetList = (input: string): void => {
    this.netList = input;
  };

  public setOutputEvent = (outputEvent: (out: string) => void): void => {
    this.outputEvent = outputEvent;
  };
  public getResult = (): ResultType => {
    return this.results;
  };
  public getInfo = (): string => {
    return this.info;
  };

  public getInitInfo = (): string => {
    return this.initInfo;
  };
  public getError = (): string[] => {
    return this.error;
  };
  public isInitialized = (): boolean => {
    return this.initialized;
  };
  private log_debug = (message?: any, ...optionalParams: any[]) => {
    //console.log("simLink-> ", message, optionalParams);
  };
}

export const simulation = new Simulation();
Comlink.expose(simulation);
