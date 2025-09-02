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
  children: React.ReactNode;
};

const ToggleActionButton: React.FC<ToggleActionButtonProps> = ({
  tooltip,
  onEnable,
  onDisable,
  defaultPressed,
  defaultState,
  children,
}) => {
  const initial = (defaultState ?? defaultPressed) ?? false;
  const [pressed, setPressed] = React.useState<boolean>(initial);

  const handleClick = React.useCallback(() => {
    const next = !pressed;
    setPressed(next);
    if (next) {
      onEnable();
    } else {
      onDisable();
    }
  }, [pressed, onEnable, onDisable]);

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
