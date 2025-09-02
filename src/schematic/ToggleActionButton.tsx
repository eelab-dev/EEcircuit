import React from "react";
import { IconButton } from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import { actionBarTheme } from "src/styles/uiThemes";

type ToggleActionButtonProps = {
  tooltip: string;
  onEnable: () => void;
  onDisable: () => void;
  // Optional initial pressed state. `defaultState` is an alias for convenience.
  defaultPressed?: boolean;
  defaultState?: boolean;
  // Optional controlled state
  pressed?: boolean;
  onToggle?: (next: boolean) => void;
  children: React.ReactNode;
};

const ToggleActionButton: React.FC<ToggleActionButtonProps> = ({
  tooltip,
  onEnable,
  onDisable,
  defaultPressed,
  defaultState,
  pressed: controlledPressed,
  onToggle,
  children,
}) => {
  const initial = (defaultState ?? defaultPressed) ?? false;
  const [internalPressed, setInternalPressed] = React.useState<boolean>(initial);
  const isControlled = typeof controlledPressed === "boolean";
  const pressed = isControlled ? controlledPressed! : internalPressed;

  const handleClick = React.useCallback(() => {
    const next = !pressed;
    if (isControlled) {
      onToggle?.(next);
    } else {
      setInternalPressed(next);
    }
    if (next) {
      onEnable();
    } else {
      onDisable();
    }
  }, [pressed, isControlled, onToggle, onEnable, onDisable]);

  return (
    <Tooltip content={tooltip} showArrow openDelay={300}>
      <IconButton
        aria-label={tooltip}
        aria-pressed={pressed}
        bg={pressed ? actionBarTheme.buttonIconBgSelected : actionBarTheme.buttonIconBg}
        border={actionBarTheme.border}
        backdropFilter={actionBarTheme.backdropFilter}
        color={pressed ? "fg" : "fg.inverted"}
        onClick={handleClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
};

export default ToggleActionButton;
