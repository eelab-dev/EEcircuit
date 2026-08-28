import editorWorker from "monaco-editor/editor/editor.worker.js?worker";

// Monaco environment needs to be set on self for web worker support
interface MonacoEnvironmentGlobal {
  MonacoEnvironment: {
    getWorker(_: unknown, label: string): Worker;
  };
}

(self as unknown as MonacoEnvironmentGlobal).MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};
