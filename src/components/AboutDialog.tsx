
import React from "react";
import { Dialog, IconButton, Portal, Link, Text, VStack, HStack, Button, Flex } from "@chakra-ui/react";
import { X, ExternalLink, Info, Bug, BookOpen } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { dialogTheme } from "../styles/uiThemes";

type AboutDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Portal>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            onClose();
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW={{ base: "95vw", sm: "450px" }}
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex="modal"
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            borderWidth={dialogTheme.borderWidth}
            borderColor={dialogTheme.borderColor}
            borderRadius="md"
            p={6}
          >
            <Dialog.Header position="relative" pb="4">
              <HStack gap={2}>
                <Info size={20} />
                <Dialog.Title fontSize="xl">About EEcircuit</Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  position="absolute"
                  top="0"
                  right="0"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <X />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={6}>
                <HStack gap={3} align="flex-start">
                  <BookOpen size={18} style={{ marginTop: '4px' }} />
                  <VStack align="flex-start" gap={0}>
                    <Text fontWeight="bold">Need help?</Text>
                    <Text fontSize="sm" color="fg.muted">
                      Find comprehensive guides and documentation at{" "}
                      <Link
                        href="https://help.eecircuit.com"
                        target="_blank"
                        color="blue.500"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        help.eecircuit.com <ExternalLink size={12} />
                      </Link>
                    </Text>
                  </VStack>
                </HStack>

                <HStack gap={3} align="flex-start">
                  <SiGithub size={18} style={{ marginTop: '4px' }} />
                  <VStack align="flex-start" gap={0}>
                    <Text fontWeight="bold">Open Source</Text>
                    <Text fontSize="sm" color="fg.muted">
                      EEcircuit is open source. Explore the code and contribute on our{" "}
                      <Link
                        href="https://github.com/eelab-dev/EEcircuit"
                        target="_blank"
                        color="blue.500"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        GitHub repository <ExternalLink size={12} />
                      </Link>
                    </Text>
                  </VStack>
                </HStack>

                <HStack gap={3} align="flex-start">
                  <Bug size={18} style={{ marginTop: '4px' }} />
                  <VStack align="flex-start" gap={0}>
                    <Text fontWeight="bold">Found a bug?</Text>
                    <Text fontSize="sm" color="fg.muted">
                      Help us improve by reporting issues on our{" "}
                      <Link
                        href="https://github.com/eelab-dev/EEcircuit/issues"
                        target="_blank"
                        color="blue.500"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        Issue Tracker <ExternalLink size={12} />
                      </Link>
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer pt="4">
              <Flex justify="flex-end" width="100%">
                <Button colorPalette="blue" onClick={onClose}>
                  Okay
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
};

export default AboutDialog;
