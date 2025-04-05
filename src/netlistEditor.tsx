import { Flex } from "@chakra-ui/react";
import React, { Suspense, useEffect, useState } from "react";
import EditorCustom from "./editor/editorCustom";
import { useColorModeValue } from "./components/ui/color-mode";
import { Skeleton } from "@chakra-ui/react";

type NetlistEditorProps = {
  netList: string;
};

const NetlistEditor: React.FC<NetlistEditorProps> = ({ netList = "" }) => {
  const [windowSize, setWindowSize] = useState({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: globalThis.innerWidth,
        height: globalThis.innerHeight,
      });
    };

    globalThis.addEventListener("resize", handleResize);
    return () => {
      globalThis.removeEventListener("resize", handleResize);
    };
  }, []);
  const handleEditor = React.useCallback((value: string | undefined) => {
    if (value) {
      //setNetList(value);
    }
  }, []);
  return (
    <Flex width="100%">
      <Suspense fallback={<Skeleton height="50vh" width="100%" />}>
        <EditorCustom
          height="50vh"
          width="100%"
          language="spice"
          value={netList}
          valueChanged={handleEditor}
          theme={useColorModeValue("light", "dark")}
          key={windowSize.width}
        />
      </Suspense>
    </Flex>
  );
};

export default NetlistEditor;
