import type * as MonacoEditor from "monaco-editor/editor";

export const SPICE_LANGUAGE_ID = "spice";

const ENGINEERING_SUFFIX_SOURCE = "(?:[Mm][Ee][Gg]|[TtGgKkMmUuNnPpFfAa])";
const NUMBER_SOURCE = `[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?(?:${ENGINEERING_SUFFIX_SOURCE})?`;
const SWEEP_VALUE_SOURCE = "[+-]?\\d+(?:\\.\\d+)?(?:Meg|[uMmkGTpnfa])?";
const SWEEP_SOURCE = `\\[${SWEEP_VALUE_SOURCE}\\s*:\\s*${SWEEP_VALUE_SOURCE}\\s*:\\s*${SWEEP_VALUE_SOURCE}\\](?:\\s*(?:Meg|[uMmkGTpnfa]))?`;

export const SPICE_NUMBER_PATTERN = new RegExp(`^${NUMBER_SOURCE}$`);
export const SPICE_SWEEP_PATTERN = new RegExp(`^${SWEEP_SOURCE}$`);
export const SPICE_DIRECTIVE_PATTERN = /^\s*\.[A-Za-z][\w]*/;
export const SPICE_COMMENT_PATTERN = /^\s*\*.*/;

export const spiceMonarchLanguage: MonacoEditor.languages.IMonarchLanguage = {
  defaultToken: "",
  ignoreCase: true,
  keywords: ["ac", "dc", "exp", "pwl", "pulse", "sin"],
  tokenizer: {
    root: [
      [SPICE_COMMENT_PATTERN, "comment"],
      [/^(\s*)(\.[A-Za-z][\w]*)/, ["white", "keyword.directive"]],
      [/[ \t\r\n]+/, "white"],
      [new RegExp(SWEEP_SOURCE), "number.sweep"],
      [/"[^"\r\n]*"|'[^'\r\n]*'/, "string"],
      [new RegExp(NUMBER_SOURCE), "number"],
      [/[A-Za-z_][\w.$#]*(?=\s*=)/, "attribute.name"],
      [/[A-Za-z_][\w.$#]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[()[\]{}]/, "@brackets"],
      [/[=<>+\-*/^]/, "operator"],
      [/[,:;]/, "delimiter"],
    ],
  },
};

export const spiceLanguageConfiguration: MonacoEditor.languages.LanguageConfiguration = {
  comments: { lineComment: "*" },
  brackets: [
    ["(", ")"],
    ["[", "]"],
  ],
  colorizedBracketPairs: [
    ["(", ")"],
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  wordPattern: /(?:\.[A-Za-z][\w]*)|(?:[A-Za-z_][\w.$#]*)|(?:[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:[Mm][Ee][Gg]|[TtGgKkMmUuNnPpFfAa])?)/g,
};

export interface SpiceCompletionTemplate {
  label: string;
  documentation: string;
  insertText: string;
}

export const SPICE_DIRECTIVE_COMPLETIONS: readonly SpiceCompletionTemplate[] = [
  {
    label: ".include",
    documentation: "Include an external SPICE model or netlist file.",
    insertText: ".include ${1:model_file}",
  },
  {
    label: ".tran",
    documentation: "Run a transient analysis with a time step and stop time.",
    insertText: ".tran ${1:time_step} ${2:stop_time}",
  },
  {
    label: ".dc",
    documentation: "Sweep a voltage or current source over a range.",
    insertText: ".dc ${1:source} ${2:start_value} ${3:stop_value} ${4:step}",
  },
  {
    label: ".ac",
    documentation: "Run a small-signal AC analysis over a frequency range.",
    insertText: ".ac ${1|dec,oct,lin|} ${2:points} ${3:start_frequency} ${4:stop_frequency}",
  },
  {
    label: ".save",
    documentation: "Select voltage, current, or expression vectors to save.",
    insertText: ".save ${1|v(node),i(source)|}",
  },
  {
    label: ".param",
    documentation: "Define a reusable SPICE parameter.",
    insertText: ".param ${1:name}=${2:value}",
  },
];

export const SPICE_COMPONENT_COMPLETIONS: readonly SpiceCompletionTemplate[] = [
  {
    label: "R (resistor)",
    documentation: "Insert a resistor with two nodes and a resistance value.",
    insertText: "R${1:number} ${2:node1} ${3:node2} ${4:value}",
  },
  {
    label: "C (capacitor)",
    documentation: "Insert a capacitor with two nodes and a capacitance value.",
    insertText: "C${1:number} ${2:node1} ${3:node2} ${4:value}",
  },
  {
    label: "L (inductor)",
    documentation: "Insert an inductor with two nodes and an inductance value.",
    insertText: "L${1:number} ${2:node1} ${3:node2} ${4:value}",
  },
  {
    label: "M (MOSFET)",
    documentation: "Insert a MOSFET with drain, gate, source, bulk, model, width, and length.",
    insertText: "M${1:number} ${2:d} ${3:g} ${4:s} ${5:b} ${6:model} W=${7:width} L=${8:length}",
  },
  {
    label: "V (voltage source)",
    documentation: "Insert an independent DC voltage source.",
    insertText: "V${1:number} ${2:node1} ${3:node2} DC ${4:voltage}",
  },
  {
    label: "V (voltage source - pulsed)",
    documentation: "Insert an independent pulsed voltage source.",
    insertText: "V${1:number} ${2:node1} ${3:node2} PULSE(${4:v1} ${5:v2} ${6:delay} ${7:rise_time} ${8:fall_time} ${9:width} ${10:period})",
  },
  {
    label: "V (voltage source - sinusoidal)",
    documentation: "Insert an independent sinusoidal voltage source.",
    insertText: "V${1:number} ${2:node1} ${3:node2} SIN(${4:offset} ${5:amplitude} ${6:frequency} ${7:delay} ${8:damping} ${9:phase})",
  },
  {
    label: "I (current source)",
    documentation: "Insert an independent DC current source.",
    insertText: "I${1:number} ${2:node1} ${3:node2} DC ${4:current}",
  },
  {
    label: "I (current source - pulsed)",
    documentation: "Insert an independent pulsed current source.",
    insertText: "I${1:number} ${2:node1} ${3:node2} PULSE(${4:i1} ${5:i2} ${6:delay} ${7:rise_time} ${8:fall_time} ${9:width} ${10:period})",
  },
  {
    label: "G (VCCS)",
    documentation: "Insert a voltage-controlled current source.",
    insertText: "G${1:number} ${2:n+} ${3:n-} ${4:nc+} ${5:nc-} ${6:gain}",
  },
  {
    label: "E (VCVS)",
    documentation: "Insert a voltage-controlled voltage source.",
    insertText: "E${1:number} ${2:n+} ${3:n-} ${4:nc+} ${5:nc-} ${6:gain}",
  },
];

export interface SpiceCompletionContext {
  type: "component" | "directive";
  startColumn: number;
  endColumn: number;
}

export function getSpiceCompletionContext(
  linePrefix: string,
  cursorColumn: number,
): SpiceCompletionContext | null {
  const directive = /^(\s*)\.[A-Za-z]*$/.exec(linePrefix);
  if (directive) {
    return {
      type: "directive",
      startColumn: (directive[1]?.length ?? 0) + 1,
      endColumn: cursorColumn,
    };
  }

  const component = /^(\s*)[A-Za-z]*$/.exec(linePrefix);
  if (component) {
    return {
      type: "component",
      startColumn: (component[1]?.length ?? 0) + 1,
      endColumn: cursorColumn,
    };
  }

  return null;
}

let servicesRegistered = false;
const serviceDisposables: MonacoEditor.IDisposable[] = [];

export function registerSpiceLanguage(monaco: typeof MonacoEditor): void {
  if (servicesRegistered) return;

  if (!monaco.languages.getLanguages().some(({ id }) => id === SPICE_LANGUAGE_ID)) {
    monaco.languages.register({ id: SPICE_LANGUAGE_ID });
  }

  serviceDisposables.push(
    monaco.languages.setMonarchTokensProvider(SPICE_LANGUAGE_ID, spiceMonarchLanguage),
    monaco.languages.setLanguageConfiguration(SPICE_LANGUAGE_ID, spiceLanguageConfiguration),
    monaco.languages.registerCompletionItemProvider(SPICE_LANGUAGE_ID, {
      triggerCharacters: ["."],
      provideCompletionItems(model, position) {
        const linePrefix = model
          .getLineContent(position.lineNumber)
          .slice(0, position.column - 1);
        const context = getSpiceCompletionContext(linePrefix, position.column);
        if (!context) return { suggestions: [] };

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: context.startColumn,
          endColumn: context.endColumn,
        };
        const templates = context.type === "directive"
          ? SPICE_DIRECTIVE_COMPLETIONS
          : SPICE_COMPONENT_COMPLETIONS;

        return {
          suggestions: templates.map((template) => ({
            ...template,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        };
      },
    }),
  );
  servicesRegistered = true;
}

export function disposeSpiceLanguageServices(): void {
  while (serviceDisposables.length > 0) {
    serviceDisposables.pop()?.dispose();
  }
  servicesRegistered = false;
}

const hotModule = (import.meta as ImportMeta & {
  hot?: { dispose(callback: () => void): void };
}).hot;

if (hotModule) {
  hotModule.dispose(disposeSpiceLanguageServices);
}
