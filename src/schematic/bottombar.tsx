import React from "react";
import { Button } from "@chakra-ui/react";
import { LayoutDashboard, Cable, CirclePlus, Square } from "lucide-react";
import { bottomBarTheme, dialogTheme } from "../styles/uiThemes";
import { PointerInfo } from "eecircuit-schematic";

type BottomBarProps = {
  coord: { x: number; y: number };
  pointerInfo: PointerInfo | null;
};

const getPointerIcon = (pointerInfo: PointerInfo | null) => {
  if (!pointerInfo) return null;

  switch (pointerInfo.type) {
    case "wire":
      return <Cable size={16} />;
    case "junction":
      return <CirclePlus size={16} />;
    case "instance":
    case "text":
      return <LayoutDashboard size={16} />;
    case "terminal":
      return <Square size={16} />;
    default:
      return null;
  }
};

const BottomBar: React.FC<BottomBarProps> = ({ coord, pointerInfo }) => {
  const formatCoord = (value: number) => {
    return value >= 0
      ? ` ${value.toString().padStart(3, " ")}`
      : `${value.toString().padStart(4, " ")}`;
  };

  return (
    <>
      <Button
        position="absolute"
        bottom="1rem"
        left="50%"
        transform="translateX(-50%)"
        zIndex={100}
        size="sm"
        variant="outline"
        color={bottomBarTheme.primaryText}
        borderColor={dialogTheme.borderColor}
        bg={bottomBarTheme.bg}
        borderRadius={bottomBarTheme.borderRadius}
        backdropFilter={bottomBarTheme.backdropFilter}
        cursor="default"
        _hover={{}}
        _active={{}}
        fontFamily="mono"
      >
        {`X:${formatCoord(coord.x)}, Y:${formatCoord(coord.y)}`}
      </Button>
      {pointerInfo && (
        <Button
          position="absolute"
          bottom="1rem"
          left="50%"
          transform="translateX(calc(-50% + 140px))"
          zIndex={100}
          size="sm"
          variant="outline"
          color={bottomBarTheme.primaryText}
          borderColor={bottomBarTheme.borderColor}
          borderRadius={bottomBarTheme.borderRadius}
          bg={bottomBarTheme.bg}
          backdropFilter={bottomBarTheme.backdropFilter}
          cursor="default"
          _hover={{}}
          _active={{}}
          gap={2}
        >
          {getPointerIcon(pointerInfo)}
          {pointerInfo.name}
        </Button>
      )}
    </>
  );
};

export default BottomBar;
