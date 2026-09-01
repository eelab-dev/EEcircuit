<script lang="ts">
  import { onMount } from "svelte";
  import type * as Monaco from "monaco-editor/editor";

  let {
    value,
    theme,
    onChange,
  }: {
    value: string;
    theme: "light" | "dark";
    onChange: (value: string) => void;
  } = $props();

  let container: HTMLDivElement;
  let editor = $state<Monaco.editor.IStandaloneCodeEditor | null>(null);
  let monaco = $state<typeof Monaco | null>(null);

  onMount(() => {
    let disposed = false;
    let contentSubscription: Monaco.IDisposable | undefined;
    void Promise.all([
      import("monaco-editor/editor"),
      import("monaco-editor/features/codeEditor/register"),
      import("monaco-editor/features/tokenization/register"),
      import("monaco-editor/features/clipboard/register"),
      import("monaco-editor/features/contextmenu/register"),
      import("monaco-editor/features/find/register"),
      import("monaco-editor/features/snippet/register"),
      import("monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js"),
      import("../../editor/useWorker"),
      import("../../editor/spiceLanguage"),
    ]).then(([editorModule, , , , , , , , , spiceModule]) => {
      if (disposed) return;
      monaco = editorModule;
      spiceModule.registerSpiceLanguage(editorModule);
      editor = editorModule.editor.create(container, {
        value,
        language: "spice",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        theme: theme === "light" ? "vs" : "vs-dark",
        automaticLayout: true,
        quickSuggestions: true,
        wordBasedSuggestions: "allDocuments",
        contextmenu: true,
        ariaLabel: "Editor content",
      });
      contentSubscription = editor.onDidChangeModelContent(() => {
        if (editor) onChange(editor.getValue());
      });
    }).catch((error) => {
      console.error("Monaco initialization failed:", error);
    });

    return () => {
      disposed = true;
      contentSubscription?.dispose();
      editor?.dispose();
      editor = null;
    };
  });

  $effect(() => {
    if (!editor || editor.getValue() === value) return;
    editor.setValue(value);
  });

  $effect(() => {
    if (monaco && editor) monaco.editor.setTheme(theme === "light" ? "vs" : "vs-dark");
  });
</script>

<div class="monaco-host" bind:this={container}></div>
