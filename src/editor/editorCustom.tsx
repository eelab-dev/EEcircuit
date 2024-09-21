import React, { FC, useState, useEffect, useRef } from "react";
import * as MonacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import './useWorker';
//import * as monaco from "monaco-editor";




export const EditorCustom: FC = ()  => {
  

  const [editor, setEditor] = useState<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
	const containerRef = useRef(null);

	useEffect(() => {
		if (containerRef) {
			setEditor((editor) => {
				if (editor) return editor;

				return MonacoEditor.editor.create(containerRef.current!, {
					value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
					language: 'typescript'
				});
			});
		}

		return () => editor?.dispose();
	}, [containerRef.current]);

  
  /*useEffect(() => {
    
      //const monacoEditor = await monaco.init();
      console.log('Hello');
      
      
      

      const monacoEditor = MonacoEditor;
      monacoRef.current = monacoEditor;
      editorRef.current = monacoEditor.editor;

      
      editorCodeRef.current = monacoRef.current.editor.create(containerRef.current, {
        value: "// First line\nfunction hello() {\n\talert('Hello world!');\n}\n// Last line",
        language: "typescript",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        theme: "vs-dark",
        automaticLayout: true,
        quickSuggestions: true,
        wordBasedSuggestions: 'allDocuments'
        // ...,
      });

      
      
      //etIsMonacoReady(true);
    
    
    console.log("mon", monacoRef.current?.languages);
  }, []);

  useEffect(() => {
    
    if (monacoRef.current && containerRef.current) {
      

      console.log("editorCodeRef", editorCodeRef.current);

      setIsEditorCodeMounted(true);
    }
  }, [isMonacoReady, containerRef]);

  useEffect(() => {
    if (editorRef.current && editorCodeRef.current && isEditorCodeMounted) {
      
      //editorCodeRef.current.setValue(value ? value : "hello!");
      //editorCodeRef.current.onDidChangeModelContent(monacoEvent);
    }
  }, [isEditorCodeMounted]);

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
  };*/

  return (
    <div
      style={
        {
          width: "100%",
          height: "20vh",
        }
      }
      ref={containerRef}></div>
  );
};


