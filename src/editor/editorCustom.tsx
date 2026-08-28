"use client";

import React, { useEffect, useRef, useCallback } from "react";
import * as MonacoEditor from "monaco-editor/editor";
import "monaco-editor/features/codeEditor/register";
import "monaco-editor/features/tokenization/register";
import "monaco-editor/features/clipboard/register";
import "monaco-editor/features/contextmenu/register";
import "monaco-editor/features/find/register";
// Monaco 0.56 exposes the classic suggestion controller through this supported entry point.
import "monaco-editor/features/inlineCompletions/register";
import "monaco-editor/features/snippet/register";
import "./useWorker.ts";
import { registerSpiceLanguage } from "./spiceLanguage";

registerSpiceLanguage(MonacoEditor);

type EditorCustomType = {
  value?: string;
  language?: string;
  modelChangedContent?: (
    editorCode: MonacoEditor.editor.IStandaloneCodeEditor | undefined,
    changedText: MonacoEditor.editor.IModelContentChangedEvent
  ) => void;
  valueChanged?: (value: string | undefined) => void;
  theme?: "light" | "dark";
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
  width,
  height,
}: EditorCustomType) => {
  const editorCodeRef =
    useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialEditorThemeRef = useRef<string>(
    theme === "light" ? "vs" : "vs-dark"
  );
  const initialEditorValueRef = useRef(value);

  useEffect(() => {
    if (containerRef.current && !editorCodeRef.current) {
      editorCodeRef.current = MonacoEditor.editor.create(
        containerRef.current,
        {
          value: initialEditorValueRef.current ?? "",
          language: "spice",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          theme: initialEditorThemeRef.current,
          automaticLayout: true,
          quickSuggestions: true,
          wordBasedSuggestions: "allDocuments",
          contextmenu: true,
        }
      );
    }

    return () => {
      if (editorCodeRef.current) {
        editorCodeRef.current.dispose();
        editorCodeRef.current = null;
      }
    };
  }, []);

  const monacoEvent = useCallback(
    (e: MonacoEditor.editor.IModelContentChangedEvent) => {
      const editorCode = editorCodeRef.current;
      if (editorDidMount) {
        editorDidMount(editorCode ?? undefined, e);
      }
      if (valueChanged) {
        valueChanged(editorCode?.getValue());
      }
    },
    [editorDidMount, valueChanged]
  );

  useEffect(() => {
    if (editorCodeRef.current) {
      editorCodeRef.current.layout();
    }
  }, [width, height]);

  useEffect(() => {
    if (editorCodeRef.current) {
      editorCodeRef.current.updateOptions({
        theme: theme === "light" ? "vs" : "vs-dark",
      });
    }
  }, [theme]);

  useEffect(() => {
    if (!editorCodeRef.current) {
      return;
    }

    const editorInstance = editorCodeRef.current;

    if (language) {
      const model = editorInstance.getModel();
      if (model) {
        MonacoEditor.editor.setModelLanguage(model, language);
      }
    }

    const disposable = editorInstance.onDidChangeModelContent(monacoEvent);

    return () => {
      disposable.dispose();
    };
  }, [language, monacoEvent]);

  useEffect(() => {
    if (!editorCodeRef.current) {
      return;
    }

    if (value === undefined) {
      return;
    }

    const currentValue = editorCodeRef.current.getValue();
    if (currentValue === value) {
      return;
    }

    editorCodeRef.current.setValue(value);
  }, [value]);

  return (
    <div
      style={{
        display: "block",
        height,
        width,
      }}
      ref={containerRef}
    ></div>
  );
};

export default React.memo(EditorCustom);
