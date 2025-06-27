import React, { useState, useEffect } from "react";
import {
  Dialog,
  Button,
  Flex,
  IconButton,
  Portal,
  Box,
  Spinner,
  Menu,
} from "@chakra-ui/react";
import { X, ZoomIn, ZoomOut, Download, ChevronDown } from "lucide-react";
import { convertSvgToPdf } from "../utils/svgToPdf";

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

  const handleDownloadSVG = () => {
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

  const handleDownloadPNG = () => {
    if (!svgContent) return;

    // Create a temporary canvas to convert SVG to PNG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create an image element to load the SVG
    const img = new Image();

    img.onload = () => {
      // Set canvas size to match the image
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      // Disable anti-aliasing for crisp edges
      ctx.imageSmoothingEnabled = false;

      // Draw the SVG image onto the canvas (transparent background by default)
      ctx.drawImage(img, 0, 0);

      // Convert canvas to PNG blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "schematic.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    };

    // Load the SVG data URL into the image
    img.src = svgDataUrl;
  };

  const handleDownloadPDF = async () => {
    if (!svgContent) return;

    try {
      console.log("Starting PDF generation...");

      // Use the new utility function to convert SVG to PDF
      const pdfBytes = await convertSvgToPdf(svgContent, {
        backgroundColor: "white",
        scale: 1,
      });

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "schematic.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("PDF download completed successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please check the console for details.");
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
            maxW="90vw"
            maxH="85vh"
            w="auto"
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex="modal"
            margin="auto"
          >
            <Dialog.Header position="relative" pb="4">
              <Dialog.Title>Export Schematic</Dialog.Title>
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
                  minH="min(50vh, 12.5rem)"
                  minW="min(80vw, 25rem)"
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
                  maxW="min(37.5rem, 80vw)"
                  h="min(31.25rem, 60vh)"
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
                    <span style={{ marginLeft: "0.5rem" }}>
                      {isFullScale ? "Fit to View" : "1:1 Scale"}
                    </span>
                  </Button>
                )}
                <Flex>
                  <Button variant="outline" onClick={onClose} mr={3}>
                    Close
                  </Button>
                  <Menu.Root>
                    <Menu.Trigger asChild>
                      <Button variant="outline" disabled={!svgContent}>
                        <Download />
                        <span style={{ marginLeft: "0.5rem" }}>Download</span>
                        <ChevronDown style={{ marginLeft: "0.5rem" }} />
                      </Button>
                    </Menu.Trigger>
                    <Menu.Positioner>
                      <Menu.Content>
                        <Menu.Item value="svg" onClick={handleDownloadSVG}>
                          Download as SVG
                        </Menu.Item>
                        <Menu.Item value="png" onClick={handleDownloadPNG}>
                          Download as PNG
                        </Menu.Item>
                        <Menu.Item value="pdf" onClick={handleDownloadPDF}>
                          Download as PDF
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Menu.Root>
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
