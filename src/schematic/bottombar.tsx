import React, { useState, useEffect } from "react";
import { Button, Flex } from "@chakra-ui/react";
import {
  LayoutDashboard,
  Cable,
  CirclePlus,
  Square,
  ArrowBigRight,
} from "lucide-react";
import { bottomBarTheme } from "../styles/uiThemes";
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

const BottomBar: React.FC<BottomBarProps> = ({
  coord,
  pointerInfo,
  onSendToNetlist,
}) => {
  const [isWideView, setIsWideView] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsWideView(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const formatCoord = (value: number) => {
    return value >= 0
      ? ` ${value.toString().padStart(3, " ")}`
      : `${value.toString().padStart(4, " ")}`;
  };

  // Shared button styles
  const baseButtonStyles = {
    size: "sm" as const,
    variant: "outline" as const,
    color: bottomBarTheme.primaryText,
    borderColor: bottomBarTheme.borderColor,
    borderRadius: bottomBarTheme.borderRadius,
    bg: bottomBarTheme.bg,
    backdropFilter: bottomBarTheme.backdropFilter,
    cursor: "default" as const,
    _hover: {},
    _active: {},
    pointerEvents: "auto" as const,
    flexShrink: 0,
  };

  // Coordinate button component
  const CoordButton = ({
    additionalStyles = {},
  }: {
    additionalStyles?: Record<string, unknown>;
  }) => (
    <Button {...baseButtonStyles} fontFamily="mono" {...additionalStyles}>
      {`X:${formatCoord(coord.x)}, Y:${formatCoord(coord.y)}`}
    </Button>
  );

  // Pointer info button component
  const PointerInfoButton = ({
    additionalStyles = {},
  }: {
    additionalStyles?: Record<string, unknown>;
  }) =>
    pointerInfo ? (
      <Button {...baseButtonStyles} gap={2} {...additionalStyles}>
        {getPointerIcon(pointerInfo)}
        {pointerInfo.name}
      </Button>
    ) : null;

  // Simulate Netlist button component
  const SimulateButton = () => (
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
      {isWideView ? "Simulate (Netlist)" : "Simulate"}
      <ArrowBigRight size={16} />
    </Button>
  );

  return (
    <Flex
      position="absolute"
      bottom="1rem"
      left="1rem"
      right="1rem"
      zIndex={100}
      alignItems="center"
      justifyContent={isWideView ? "flex-end" : "space-between"}
      gap={4}
      pointerEvents="none"
    >
      {isWideView ? (
        <>
          {/* Wide view: Centered coordinate label */}
          <CoordButton
            additionalStyles={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />

          {/* Pointer info to the right of coord label */}
          <PointerInfoButton
            additionalStyles={{
              position: "absolute",
              left: "50%",
              transform: "translateX(calc(-50% + 10rem))",
            }}
          />

          {/* Simulate button on right */}
          <SimulateButton />
        </>
      ) : (
        <>
          {/* Narrow view: Coord on left */}
          <CoordButton />

          {/* Pointer info in center */}
          <PointerInfoButton />

          {/* Simulate button on right */}
          <SimulateButton />
        </>
      )}
    </Flex>
  );
};

export default BottomBar;
