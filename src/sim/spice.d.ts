/**
 *
 */

type ModuleType = {
  argumnets?: string;
  noInitialRun: boolean;
  preRun: [() => void];
  FS?: FSType;
  Asyncify?: AsyncifyType;
  setHandleThings: (handleThings: () => void) => void;
  setGetInput: (getInput: () => void) => void;
  runThings: () => void;
  print: (e?: any) => void;
  printErr: (e?: any) => void;
};

/**
 * File System
 */
type FSType = {
  writeFile: (path: string, data: string) => void;
  readFile: (path: string) => Uint8Array;
};

type AsyncifyType = {
  handleAsync: (handle: () => void) => void;
};

export default function Module(m: ModuleType): Promise<ModuleType>;
