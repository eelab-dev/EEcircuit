import React from "react";
import { Button, Flex } from "@chakra-ui/react";
import { LayoutDashboard, Cable, CirclePlus, Square, ArrowBigRight } from "lucide-react";
import { bottomBarTheme, dialogTheme } from "../styles/uiThemes";
import { PointerInfo } from "eecircuit-schematic";

type BottomBarProps = {
  coord: { x: number; y: number };
  pointerInfo: PointerInfo | null;
  onSendToNetlist: () => void;
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

const BottomBar: React.FC<BottomBarProps> = ({ coord, pointerInfo, onSendToNetlist }) => {
  const formatCoord = (value: number) => {
    return value >= 0
      ? ` ${value.toString().padStart(3, " ")}`
      : `${value.toString().padStart(4, " ")}`;
  };

  return (
    <Flex
      position="absolute"
      bottom="1rem"
      left="1rem"
      right="1rem"
      zIndex={100}
      alignItems="center"
      justifyContent="space-between"
      gap={4}
      pointerEvents="none"
    >
      {/* Left: Coordinate Display */}
      <Button
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
        pointerEvents="auto"
        flexShrink={0}
      >
        {`X:${formatCoord(coord.x)}, Y:${formatCoord(coord.y)}`}
      </Button>

      {/* Center: Pointer Info */}
      {pointerInfo && (
        <Button
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
          pointerEvents="auto"
          flexShrink={0}
        >
          {getPointerIcon(pointerInfo)}
          {pointerInfo.name}
        </Button>
      )}

      {/* Right: Simulate Button */}
      <Button
        size="sm"
        onClick={onSendToNetlist}
        bg="blue.focusRing/60"
        color="gray.fg/90"
        _hover={{
          bg: "blue.emphasized/70",
          color: "gray.fg/95",
        }}
        backdropFilter="blur(5px)"
        borderRadius="lg"
        flexShrink={0}
        minWidth="fit-content"
        pointerEvents="auto"
      >
        Simulate <ArrowBigRight size={16} />
      </Button>
    </Flex>
  );
};

export default BottomBar;
