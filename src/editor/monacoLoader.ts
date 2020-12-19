/**
 * Monaco Loader
 * https://github.com/microsoft/monaco-editor-samples/blob/master/browser-amd-shared-model/index.html
 * https://github.com/suren-atoyan/monaco-react/blob/master/src/utils/monaco.js
 */
import type * as MonacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

const monacoLoader = (): Promise<typeof MonacoEditor> => {
  return new Promise((resolve) => {
    const loaded2 = (e: CustomEvent) => {
      resolve(e.detail);
    };

    document.addEventListener('monacoLoaded', loaded2 as EventListener);

    const monacoLoader = document.createElement('script') as HTMLScriptElement;
    //script3.async = true;
    //script3.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js';
    monacoLoader.async = true;
    monacoLoader.src =
      'https://cdn.jsdelivr.net/npm/monaco-editor@0.21.2/min/vs/loader.js';

    monacoLoader.crossOrigin = 'anonymous';
    const scriptLoaded = () => {
      document.body.appendChild(monacoRequire);
    };
    monacoLoader.addEventListener('load', scriptLoaded);
    document.body.appendChild(monacoLoader);

    const monacoRequire = document.createElement('script') as HTMLScriptElement;
    monacoRequire.async = true;
    //script2.type = 'module';
    monacoRequire.innerHTML = `
    require.config({"paths":{"vs":"https://cdn.jsdelivr.net/npm/monaco-editor@0.21.2/min/vs"}});
    require(['vs/editor/editor.main'], function() {
      document.dispatchEvent(new CustomEvent('monacoLoaded', {detail: monaco}));
    });
    `;
  });
};

export default monacoLoader;
