import React, { useState, useEffect, useRef } from "react";
import type * as MonacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import monacoLoader from "./monacoLoader";

// https://www.gitmemory.com/issue/microsoft/monaco-editor/1423/530617327
interface MonarchLanguageConfiguration extends MonacoEditor.languages.IMonarchLanguage {
  keywords: string[];
}

type EditorCustomType = {
  value?: string;
  language?: string;
  modelChangedContent?: (
    editorCode: MonacoEditor.editor.IStandaloneCodeEditor | undefined,
    changedText: MonacoEditor.editor.IModelContentChangedEvent
  ) => void;
  valueChanged?: (value: string | undefined) => void;
  theme?: string;
  line?: number;
  width?: string;
  height?: string;
  options?: object;
};

const EditorCustom = ({
  value,
  language,
  modelChangedContent: editorDidMount,
  valueChanged,
  theme,
  line,
  width,
  height,
  options,
}: EditorCustomType) => {
  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const [isEditorCodeMounted, setIsEditorCodeMounted] = useState(false);
  const editorCodeRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor>();
  const editorRef = useRef<typeof MonacoEditor.editor>();
  const monacoRef = useRef<typeof MonacoEditor>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = async () => {
      //const monacoEditor = await monaco.init();
      const monacoEditor = await monacoLoader();
      monacoRef.current = monacoEditor;
      editorRef.current = monacoEditor.editor;

      //const a = await loadMonaco();
      //console.log('a is loaded', a);

      monacoEditor.languages.register({ id: "spice" });
      monacoEditor.languages.setMonarchTokensProvider("spice", {
        defaultToken: "invalid",
        keywords: ["vdc", "idc", "pulse", "ac", "dc", "sin"],

        typeKeywords: [],

        operators: ["=", ">", "<"],

        // we include these common regular expressions
        symbols: /[=><!~?:&|+\-*\/\^%]+/,

        // C# style strings
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

        ignoreCase: true,

        // The main tokenizer for our languages
        tokenizer: {
          root: [
            [
              /[a-z_$][\w$]*/,
              {
                cases: {
                  "@typeKeywords": "keyword",
                  "@keywords": "keyword",
                  "@default": "identifier",
                },
              },
            ],

            // whitespace
            { include: "@whitespace" },

            [/^([.])\w+/, "type"],

            // delimiters and operators
            [/[{}()\[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],

            // @ annotations.
            // As an example, we emit a debugging log message on these tokens.
            // Note: message are supressed during the first load -- change some lines to see them.
            [/@\s*[a-zA-Z_\$][\w\$]*/, { token: "annotation", log: "annotation token: $0" }],

            // numbers
            [/\d*\.\d+([eE][\-+]?\d+)/, "number.float"],
            [/\d*\.\d+([munpf])?/, "number"],
            [/\d+([munpf])/, "number"],
            [/\d+/, "number"],

            // delimiter: after number because of .\d floats
            [/[;,.]/, "delimiter"],

            // strings
            [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

            // characters
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"],
          ],

          comment: [],

          string: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],

          whitespace: [
            [/[ \t\r\n]+/, "white"],
            //[/^(.*)$/, 'comment'],
            [/^[*].*/, "comment"],
          ],
        },
      } as MonarchLanguageConfiguration);

      const createDependencyProposalsDotCommands = (range: {
        startLineNumber: number;
        endLineNumber: number;
        startColumn: number;
        endColumn: number;
      }) => {
        // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor),
        // here you could do a server side lookup
        return [
          {
            label: ".include",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "The Lodash library exported as Node.js modules.",
            insertText: "include ${1:model_file} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: ".tran",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "The Lodash library exported as Node.js modules.",
            insertText: "tran ${1:step} ${2:max_time} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: ".dc",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "dc ${1:source} ${2:min_voltage} ${3:max_voltage} ${4:step} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          /*{
            label: ".dc (sweep)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText:
              "dc ${1:source_1st} ${2:min_voltage} ${3:max_voltage} ${4:step} ${5:source_2nd} ${6:min_voltage} ${7:max_voltage} ${8:step} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },*/
          {
            label: ".ac",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "ac ${1:dec | oct | lin} ${2:number_point} ${3:fstart} ${4:fstop} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: ".save",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "save ${1:v(node) | i(node)}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: ".parameter",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "parameter ${1:x} = ${2:y}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
        ];
      };

      const createDependencyProposalsComponents = (range: {
        startLineNumber: number;
        endLineNumber: number;
        startColumn: number;
        endColumn: number;
      }) => {
        // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor),
        // here you could do a server side lookup
        return [
          {
            label: "R (resistor)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "R${1:number} ${2:node1} ${3:node2} ${4:value}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "C (capacitor)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "C${1:number} ${2:node1} ${3:node2} ${4:value}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "L (inductance)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "L${1:number} ${2:node1} ${3:node2} ${4:value}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "M (mosfet)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "M${1:number} ${2:d} ${3:g} ${4:s} ${5:b} ${6:model} W=${7:w} L=${8:l} ",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "V (voltage source)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "V${1:number} ${2:node1} ${3:node2} ${4:dc_voltage}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "V (voltage source - pulsed)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText:
              "V${1:number} ${2:node1} ${3:node2} pulse (${4:v1} ${5:v2} ${6:time_delay} ${7:rise_time} ${8:fall_time} ${9:width} ${10:period} ${11:phase})",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "V (voltage source - sinusoidal)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText:
              "V${1:number} ${2:node1} ${3:node2} SIN (${4:offset_voltage} ${5:amplitude} ${6:frequency} ${7:delay} ${8:damping_factor} ${9:phase})",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "I (current source)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "I${1:number} ${2:node1} ${3:node2} ${4:dc_current}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "I (current source - pulsed)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText:
              "I${1:number} ${2:node1} ${3:node2} ${4:dc_current} pulse (${5:i1} ${6:i2} ${7:time_delay} ${8:rise_time} ${9:fall_time} ${10:width} ${11:period} ${12:phase})",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "G (VCCS)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "G${1:number} ${2:n+} ${3:n-} ${4:nc+} ${5:nc-} ${6:value}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
          {
            label: "E (VCVS)",
            kind: monacoEditor.languages.CompletionItemKind.Function,
            documentation: "Fast, unopinionated, minimalist web framework",
            insertText: "E${1:number} ${2:n+} ${3:n-} ${4:nc+} ${5:nc-} ${6:value}",
            insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          },
        ];
      };

      monacoEditor.languages.registerCompletionItemProvider("spice", {
        triggerCharacters: ["."],
        provideCompletionItems: function (model, position) {
          // find out if we are completing a property in the 'dependencies' object.
          let textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          let word = model.getWordUntilPosition(position);
          let range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          //console.log("monaco->", position, word);

          let c1 = word.startColumn == 1;
          if (c1) {
            //console.log("monaco->😉", position, word);
            return { suggestions: createDependencyProposalsComponents(range) };
          }

          let match = word.startColumn == 2;
          if (!match) {
            return { suggestions: [] };
          }

          return {
            suggestions: createDependencyProposalsDotCommands(range),
          };
        },
      });

      setIsMonacoReady(true);
    };
    f();
  }, []);

  useEffect(() => {
    if (monacoRef.current && containerRef.current) {
      editorCodeRef.current = monacoRef.current.editor.create(containerRef.current, {
        value: "// First line\nfunction hello() {\n\talert('Hello world!');\n}\n// Last line",
        language: "plaintext",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        theme: "vs-dark",
        automaticLayout: true,
        // ...,
      });

      setIsEditorCodeMounted(true);
    }
  }, [isMonacoReady, containerRef]);

  useEffect(() => {
    if (editorRef.current && editorCodeRef.current && isEditorCodeMounted) {
      const modelDefault = editorRef.current.createModel(
        "let a=0\n",
        language ? language : "plaintext"
      );
      const model = editorCodeRef.current.getModel();
      editorRef.current.setModelLanguage(
        model ? model : modelDefault,
        language ? language : "plaintext"
      );
      editorCodeRef.current.setValue(value ? value : "hello!");
      editorCodeRef.current.onDidChangeModelContent(monacoEvent);
    }
  }, [isEditorCodeMounted, theme, language]);

  useEffect(() => {
    if (editorRef.current && editorCodeRef.current && isEditorCodeMounted) {
      ///////////otherwsie keeps refreshing and flickering///////////////?????? put and if with getValue == value

      const v = editorCodeRef.current.getValue();

      if (value != v && value) {
        editorCodeRef.current.setValue(value);
      }
    }
  }, [value]);

  const monacoEvent = (e: MonacoEditor.editor.IModelContentChangedEvent) => {
    const changedText = e;
    const editorCode = editorCodeRef.current;
    if (editorDidMount) {
      editorDidMount(editorCode, changedText);
    }
    if (valueChanged) {
      valueChanged(editorCode?.getValue());
    }
  };

  return (
    <div
      style={{
        display: "block",
        height,
        width,
      }}
      ref={containerRef}></div>
  );
};

export default React.memo(EditorCustom);
