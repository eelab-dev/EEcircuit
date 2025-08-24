import React from "react";
import { Box, Button } from "@chakra-ui/react";
import { ArrowBigRight } from "lucide-react";

type NetlistButtonProps = {
  onSendToNetlist: () => void;
};

// special themed button

const NetlistButton: React.FC<NetlistButtonProps> = ({ onSendToNetlist }) => {
  return (
    <Box position="absolute" bottom="1rem" right="1rem" zIndex={100}>
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
      >
        Simulate <ArrowBigRight size={16} />
      </Button>
    </Box>
  );
};

export default NetlistButton;
