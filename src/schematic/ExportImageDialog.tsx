import React, { useState, useEffect } from "react";
import {
  Dialog,
  Button,
  Flex,
  IconButton,
  Portal,
  Box,
  Spinner,
} from "@chakra-ui/react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

type ExportImageDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  svgContent: string | null;
  loading: boolean;
};

const ExportImageDialog: React.FC<ExportImageDialogProps> = ({
  isOpen,
  onClose,
  svgContent,
  loading,
}) => {
  const [isFullScale, setIsFullScale] = useState(false);

  // Convert SVG to data URL for img element
  const getSvgDataUrl = (content: string | null) => {
    if (!content) return "";
    const blob = new Blob([content], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  };

  const svgDataUrl = getSvgDataUrl(svgContent);

  // Cleanup blob URL when component unmounts or svgContent changes
  useEffect(() => {
    return () => {
      if (svgDataUrl) {
        URL.revokeObjectURL(svgDataUrl);
      }
    };
  }, [svgDataUrl]);

  const handleDownload = () => {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "schematic.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

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
            maxW="700px"
            maxH="90vh"
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex="modal"
          >
            <Dialog.Header position="relative" pb="4">
              <Dialog.Title>Export Schematic as SVG</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  position="absolute"
                  top="0"
                  right="0"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                >
                  <X />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="6">
              {loading && (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minH="200px"
                  minW="400px"
                >
                  <Spinner size="xl" />
                </Box>
              )}
              {svgContent && (
                <Box
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="white"
                  p={4}
                  w="100%"
                  maxW="600px"
                  h="500px"
                  overflow={isFullScale ? "auto" : "hidden"}
                  display={isFullScale ? "block" : "flex"}
                  justifyContent={isFullScale ? "unset" : "center"}
                  alignItems={isFullScale ? "unset" : "center"}
                >
                  {isFullScale ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                      style={{
                        minWidth: "max-content",
                        minHeight: "max-content",
                      }}
                    />
                  ) : (
                    <img
                      src={svgDataUrl}
                      alt="Schematic"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  )}
                </Box>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Flex justify="space-between" width="100%" align="center">
                {svgContent && (
                  <Button
                    variant="outline"
                    onClick={() => setIsFullScale(!isFullScale)}
                  >
                    {isFullScale ? <ZoomOut /> : <ZoomIn />}
                    <span style={{ marginLeft: "8px" }}>
                      {isFullScale ? "Fit to View" : "1:1 Scale"}
                    </span>
                  </Button>
                )}
                <Flex>
                  <Button variant="outline" onClick={onClose} mr={3}>
                    Close
                  </Button>
                  <Button
                    colorScheme="blue"
                    onClick={handleDownload}
                    disabled={!svgContent}
                  >
                    Download
                  </Button>
                </Flex>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
};

export default ExportImageDialog;
