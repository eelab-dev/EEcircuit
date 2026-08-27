import { createContext, useContext } from "react";
import type { SchematicEditor } from "eecircuit-schematic";

export const SchematicEditorContext = createContext<SchematicEditor | null>(null);

export const useSchematicEditor = (): SchematicEditor => {
  const editor = useContext(SchematicEditorContext);
  if (!editor) {
    throw new Error("Schematic editor is not ready");
  }
  return editor;
};
