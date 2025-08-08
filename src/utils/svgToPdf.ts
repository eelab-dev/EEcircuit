import { PDFDocument, rgb, PDFPage } from "pdf-lib";

/**
 * Options for SVG to PDF conversion
 */
export interface SvgToPdfOptions {
  /** Fixed width for the PDF page (if not provided, will use SVG dimensions) */
  width?: number;
  /** Fixed height for the PDF page (if not provided, will use SVG dimensions) */
  height?: number;
  /** Background color for the PDF (e.g., "white", "#ffffff", "rgb(255,255,255)") */
  backgroundColor?: string;
  /** Scale factor for the entire PDF (default: 1) */
  scale?: number;
}

/**
 * Converts SVG content to PDF format with vector-based rendering.
 *
 * This function parses SVG elements and converts them to their PDF equivalents,
 * maintaining vector quality. Supports most common SVG elements including:
 * - Basic shapes (rect, circle, ellipse, line)
 * - Text elements
 * - Polylines and polygons
 * - Groups with transforms
 * - Path elements (lines, curves, arcs) - converted to line segments
 *
 * Note: Complex path elements like arcs are approximated with line segments.
 * For production use, consider implementing proper arc-to-bezier conversion.
 *
 * @param svgContent - The SVG content as a string
 * @param options - Configuration options for the conversion
 * @returns Promise that resolves to PDF bytes (Uint8Array)
 *
 * @example
 * ```typescript
 * const svgContent = '<svg width="100" height="100">...</svg>';
 * const pdfBytes = await convertSvgToPdf(svgContent, {
 *   backgroundColor: "white",
 *   scale: 2
 * });
 * ```
 */

export const convertSvgToPdf = async (
  svgContent: string,
  options: SvgToPdfOptions = {}
): Promise<Uint8Array> => {
  // Parse SVG content
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");

  if (!svgElement) {
    throw new Error("No SVG element found in the provided content");
  }

  // Extract SVG dimensions and viewBox
  const {
    width: svgWidth,
    height: svgHeight,
    viewBox,
  } = extractSvgDimensions(svgElement);

  // Use provided dimensions or fall back to SVG dimensions
  const finalWidth = options.width || svgWidth;
  const finalHeight = options.height || svgHeight;
  const scale = options.scale || 1;

  console.log(`SVG dimensions: ${svgWidth}x${svgHeight}`);
  console.log(`PDF dimensions: ${finalWidth}x${finalHeight}, scale: ${scale}`);
  console.log(`ViewBox: ${JSON.stringify(viewBox)}`);

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([finalWidth * scale, finalHeight * scale]);

  // Set background color if specified
  if (options.backgroundColor) {
    const bgColor = parseColor(options.backgroundColor);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: finalWidth * scale,
      height: finalHeight * scale,
      color: bgColor,
    });
  }

  console.log(
    `Created PDF page with dimensions: ${finalWidth * scale} x ${finalHeight * scale}`
  );

  // Convert SVG elements to PDF operations
  await processSvgElements(
    svgElement,
    page,
    finalWidth * scale,
    finalHeight * scale,
    scale,
    viewBox
  );

  // Return PDF bytes
  return await pdfDoc.save();
};

interface SvgDimensions {
  width: number;
  height: number;
  viewBox: { x: number; y: number; width: number; height: number } | null;
}

const extractSvgDimensions = (svgElement: SVGSVGElement): SvgDimensions => {
  let width = 800;
  let height = 600;
  let viewBox = null;

  // Parse viewBox first as it's the most reliable
  const viewBoxAttr = svgElement.getAttribute("viewBox");
  if (viewBoxAttr) {
    const [x, y, w, h] = viewBoxAttr.split(/\s+/).map(Number);
    viewBox = { x: x!, y: y!, width: w!, height: h! };
    width = w!;
    height = h!;
  }

  // Try to get width and height attributes
  const widthAttr = svgElement.getAttribute("width");
  const heightAttr = svgElement.getAttribute("height");

  if (widthAttr && heightAttr) {
    const parsedWidth = parseFloat(widthAttr.replace(/[^0-9.-]/g, ""));
    const parsedHeight = parseFloat(heightAttr.replace(/[^0-9.-]/g, ""));

    if (!isNaN(parsedWidth) && !isNaN(parsedHeight)) {
      // If no viewBox, use these as the dimensions
      if (!viewBox) {
        width = parsedWidth;
        height = parsedHeight;
      }
    }
  }

  return {
    width: Math.max(width, 100),
    height: Math.max(height, 100),
    viewBox,
  };
};

const processSvgElements = async (
  svgElement: SVGSVGElement,
  page: PDFPage,
  pageWidth: number,
  pageHeight: number,
  scale: number,
  viewBox: { x: number; y: number; width: number; height: number } | null
) => {
  // Calculate transformation matrix for viewBox
  let transformX = 0;
  let transformY = 0;
  let viewBoxScale = 1;

  if (viewBox) {
    // Calculate scale to fit viewBox into page
    const scaleX = pageWidth / viewBox.width;
    const scaleY = pageHeight / viewBox.height;
    viewBoxScale = Math.min(scaleX, scaleY);

    // Calculate offset to center the viewBox content
    transformX = -viewBox.x * viewBoxScale;
    transformY = -viewBox.y * viewBoxScale;

    // Center the content if it doesn't fill the entire page
    if (scaleX > scaleY) {
      transformX += (pageWidth - viewBox.width * viewBoxScale) / 2;
    } else {
      transformY += (pageHeight - viewBox.height * viewBoxScale) / 2;
    }
  }

  const processElement = (
    element: Element,
    inheritedTransform = {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
    }
  ) => {
    const tagName = element.tagName.toLowerCase();

    // Skip non-visual elements
    if (["defs", "metadata", "title", "desc"].includes(tagName)) {
      return;
    }

    // Parse transform attribute
    const transform = parseTransform(element.getAttribute("transform") || "");

    // Log transform if present
    if (element.getAttribute("transform")) {
      console.log(
        `Element ${tagName} has transform: ${element.getAttribute("transform")}`
      );
      console.log(`Parsed transform:`, transform);
    }

    // Calculate the accumulated transform including all inherited transforms
    const currentTransform = {
      translateX: inheritedTransform.translateX + transform.translateX,
      translateY: inheritedTransform.translateY + transform.translateY,
      scaleX: inheritedTransform.scaleX * transform.scaleX,
      scaleY: inheritedTransform.scaleY * transform.scaleY,
      rotate: inheritedTransform.rotate + transform.rotate, // Accumulate rotation
      rotateX: transform.rotateX || inheritedTransform.rotateX,
      rotateY: transform.rotateY || inheritedTransform.rotateY,
    };

    // Helper function to apply all transforms to a point
    const applyAllTransforms = (x: number, y: number) => {
      let transformedX = x;
      let transformedY = y;

      // Step 1: Apply scaling (including flipping with scaleY: -1)
      transformedX *= currentTransform.scaleX;
      transformedY *= currentTransform.scaleY;

      // Step 2: Apply rotation if present
      if (currentTransform.rotate !== 0) {
        const angle = (currentTransform.rotate * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Rotate around rotation center (default to origin if not specified)
        const cx = currentTransform.rotateX;
        const cy = currentTransform.rotateY;

        const dx = transformedX - cx;
        const dy = transformedY - cy;

        transformedX = cx + dx * cos - dy * sin;
        transformedY = cy + dx * sin + dy * cos;
      }

      // Step 3: Apply translation
      transformedX += currentTransform.translateX;
      transformedY += currentTransform.translateY;

      return { x: transformedX, y: transformedY };
    };

    // Get style properties
    const style = element.getAttribute("style") || "";
    const stroke =
      element.getAttribute("stroke") ||
      getStyleValue(style, "stroke") ||
      "none";
    const fill =
      element.getAttribute("fill") || getStyleValue(style, "fill") || "black";
    const strokeWidth = parseFloat(
      element.getAttribute("stroke-width") ||
        getStyleValue(style, "stroke-width") ||
        "1"
    );

    // Convert colors
    const strokeColor = stroke !== "none" ? parseColor(stroke) : null;
    const fillColor = fill !== "none" ? parseColor(fill) : null;

    console.log(
      `Processing ${tagName}: stroke=${stroke}, fill=${fill}, strokeWidth=${strokeWidth}, rotation=${currentTransform.rotate}°`
    );

    try {
      switch (tagName) {
        case "line": {
          const x1 = parseFloat(element.getAttribute("x1") || "0");
          const y1 = parseFloat(element.getAttribute("y1") || "0");
          const x2 = parseFloat(element.getAttribute("x2") || "0");
          const y2 = parseFloat(element.getAttribute("y2") || "0");

          if (strokeColor) {
            // Apply all transforms to both points
            const point1 = applyAllTransforms(x1, y1);
            const point2 = applyAllTransforms(x2, y2);
            page.drawLine({
              start: {
                x: transformX + point1.x * viewBoxScale,
                y: pageHeight - (transformY + point1.y * viewBoxScale),
              },
              end: {
                x: transformX + point2.x * viewBoxScale,
                y: pageHeight - (transformY + point2.y * viewBoxScale),
              },
              thickness: strokeWidth * scale,
              color: strokeColor,
            });
          }
          break;
        }

        case "rect": {
          const x = parseFloat(element.getAttribute("x") || "0");
          const y = parseFloat(element.getAttribute("y") || "0");
          const width = parseFloat(element.getAttribute("width") || "0");
          const height = parseFloat(element.getAttribute("height") || "0");

          // For rectangles with any transforms, we need to draw them as four lines
          if (currentTransform.rotate !== 0 || currentTransform.scaleY < 0) {
            // Calculate all four corners
            const corners = [
              { x: x, y: y },
              { x: x + width, y: y },
              { x: x + width, y: y + height },
              { x: x, y: y + height },
            ];

            // Apply all transforms to all corners
            const transformedCorners = corners.map((corner) =>
              applyAllTransforms(corner.x, corner.y)
            );

            // Draw the rectangle as four lines
            if (strokeColor) {
              for (let i = 0; i < 4; i++) {
                const start = transformedCorners[i]!;
                const end = transformedCorners[(i + 1) % 4]!;

                page.drawLine({
                  start: {
                    x: transformX + start.x * viewBoxScale,
                    y: pageHeight - (transformY + start.y * viewBoxScale),
                  },
                  end: {
                    x: transformX + end.x * viewBoxScale,
                    y: pageHeight - (transformY + end.y * viewBoxScale),
                  },
                  thickness: strokeWidth * scale,
                  color: strokeColor,
                });
              }
            }

            // For filled rectangles with rotation, we'll skip the fill for now
            // as PDF rectangles don't support rotation directly
            if (fillColor) {
              console.warn(
                "Filled rotated rectangles are not fully supported yet"
              );
            }
          } else {
            // Non-rotated/non-transformed rectangle - use the standard approach
            const point = applyAllTransforms(x, y);
            const pdfX = transformX + point.x * viewBoxScale;
            const pdfY =
              pageHeight -
              (transformY +
                (point.y + height * currentTransform.scaleY) * viewBoxScale);

            // Draw fill first
            if (fillColor) {
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: width * currentTransform.scaleX * viewBoxScale,
                height: height * currentTransform.scaleY * viewBoxScale,
                color: fillColor,
              });
            }

            // Draw stroke
            if (strokeColor && strokeWidth > 0) {
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: width * currentTransform.scaleX * viewBoxScale,
                height: height * currentTransform.scaleY * viewBoxScale,
                borderColor: strokeColor,
                borderWidth: strokeWidth * scale,
              });
            }
          }
          break;
        }

        case "circle": {
          const cx = parseFloat(element.getAttribute("cx") || "0");
          const cy = parseFloat(element.getAttribute("cy") || "0");
          const r = parseFloat(element.getAttribute("r") || "0");

          const point = applyAllTransforms(cx, cy);
          const pdfX = transformX + point.x * viewBoxScale;
          const pdfY = pageHeight - (transformY + point.y * viewBoxScale);

          // Draw fill first
          if (fillColor) {
            page.drawCircle({
              x: pdfX,
              y: pdfY,
              size:
                r *
                viewBoxScale *
                Math.min(currentTransform.scaleX, currentTransform.scaleY),
              color: fillColor,
            });
          }

          // Draw stroke
          if (strokeColor && strokeWidth > 0) {
            page.drawCircle({
              x: pdfX,
              y: pdfY,
              size:
                r *
                viewBoxScale *
                Math.min(currentTransform.scaleX, currentTransform.scaleY),
              borderColor: strokeColor,
              borderWidth: strokeWidth * scale,
            });
          }
          break;
        }

        case "ellipse": {
          const cx = parseFloat(element.getAttribute("cx") || "0");
          const cy = parseFloat(element.getAttribute("cy") || "0");
          const rx = parseFloat(element.getAttribute("rx") || "0");
          const ry = parseFloat(element.getAttribute("ry") || "0");

          const point = applyAllTransforms(cx, cy);
          const pdfX = transformX + point.x * viewBoxScale;
          const pdfY = pageHeight - (transformY + point.y * viewBoxScale);

          // Draw fill first
          if (fillColor) {
            page.drawEllipse({
              x: pdfX,
              y: pdfY,
              xScale: rx * currentTransform.scaleX * viewBoxScale,
              yScale: ry * currentTransform.scaleY * viewBoxScale,
              color: fillColor,
            });
          }

          // Draw stroke
          if (strokeColor && strokeWidth > 0) {
            page.drawEllipse({
              x: pdfX,
              y: pdfY,
              xScale: rx * currentTransform.scaleX * viewBoxScale,
              yScale: ry * currentTransform.scaleY * viewBoxScale,
              borderColor: strokeColor,
              borderWidth: strokeWidth * scale,
            });
          }
          break;
        }

        case "text": {
          const x = parseFloat(element.getAttribute("x") || "0");
          const y = parseFloat(element.getAttribute("y") || "0");
          const fontSize = parseFloat(
            element.getAttribute("font-size") ||
              getStyleValue(style, "font-size") ||
              "12"
          );
          const text = element.textContent?.trim() || "";

          if (text && (fillColor || strokeColor)) {
            const textColor = fillColor || strokeColor!;
            const point = applyAllTransforms(x, y);

            page.drawText(text, {
              x: transformX + point.x * viewBoxScale,
              y: pageHeight - (transformY + point.y * viewBoxScale),
              size:
                fontSize *
                viewBoxScale *
                Math.min(currentTransform.scaleX, currentTransform.scaleY),
              color: textColor,
              // Note: PDF-lib doesn't support text rotation directly in this method
              // For rotated text, you'd need to use more advanced techniques
            });
          }
          break;
        }

        case "polyline":
        case "polygon": {
          const points = element.getAttribute("points");
          if (points && strokeColor) {
            const coords = parsePoints(points).map(([x, y]) => {
              const point = applyAllTransforms(x, y);
              return {
                x: transformX + point.x * viewBoxScale,
                y: pageHeight - (transformY + point.y * viewBoxScale),
              };
            });

            if (coords.length >= 2) {
              // Draw lines between consecutive points
              for (let i = 0; i < coords.length - 1; i++) {
                page.drawLine({
                  start: coords[i]!,
                  end: coords[i + 1]!,
                  thickness: strokeWidth * scale,
                  color: strokeColor,
                });
              }

              // Close the shape for polygon
              if (tagName === "polygon" && coords.length > 2) {
                page.drawLine({
                  start: coords[coords.length - 1]!,
                  end: coords[0]!,
                  thickness: strokeWidth * scale,
                  color: strokeColor,
                });
              }
            }
          }
          break;
        }

        case "path": {
          const pathData = element.getAttribute("d");
          if (pathData && (strokeColor || fillColor)) {
            console.log(
              `Processing path element with data: ${pathData.substring(0, 100)}...`
            );
            try {
              const pathOperations = parseSvgPath(pathData, {
                transformX,
                transformY,
                pageHeight,
                currentTransform,
                scaleX: viewBoxScale,
                scaleY: viewBoxScale,
                applyRotation: applyAllTransforms,
              });

              console.log(`Generated ${pathOperations.length} path operations`);

              // Execute path operations
              for (const operation of pathOperations) {
                if (operation.type === "line" && strokeColor) {
                  page.drawLine({
                    start: operation.start,
                    end: operation.end,
                    thickness: strokeWidth * scale,
                    color: strokeColor,
                  });
                } else if (operation.type === "curve" && strokeColor) {
                  // Approximate curves with multiple line segments for better accuracy
                  const segments = approximateCurve(operation);
                  for (const segment of segments) {
                    page.drawLine({
                      start: segment.start,
                      end: segment.end,
                      thickness: strokeWidth * scale,
                      color: strokeColor,
                    });
                  }
                }
              }
            } catch (error) {
              console.warn("Error parsing path data:", error);
            }
          }
          break;
        }

        case "g": {
          // Process group elements recursively with inherited transform
          Array.from(element.children).forEach((child) =>
            processElement(child, currentTransform)
          );
          return; // Don't process children again
        }
      }
    } catch (error) {
      console.warn(`Error processing ${tagName} element:`, error);
    }

    // Process child elements for non-group elements
    if (tagName !== "g") {
      Array.from(element.children).forEach((child) =>
        processElement(child, currentTransform)
      );
    }
  };

  // Process all child elements of the SVG
  Array.from(svgElement.children).forEach((child) => processElement(child));
};

const parseTransform = (transformStr: string) => {
  const transform = {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0, // rotation in degrees
    rotateX: 0, // rotation center X
    rotateY: 0, // rotation center Y
  };

  if (!transformStr) return transform;

  // Parse translate
  const translateMatch = transformStr.match(/translate\(([^)]+)\)/);
  if (translateMatch) {
    const values = translateMatch[1]!.split(/[\s,]+/).map(Number);
    transform.translateX = values[0] || 0;
    transform.translateY = values[1] || 0;
  }

  // Parse scale
  const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const values = scaleMatch[1]!.split(/[\s,]+/).map(Number);
    transform.scaleX = values[0] || 1;
    transform.scaleY = values[1] || values[0] || 1;
  }

  // Parse rotate
  const rotateMatch = transformStr.match(/rotate\(([^)]+)\)/);
  if (rotateMatch) {
    const values = rotateMatch[1]!.split(/[\s,]+/).map(Number);
    transform.rotate = values[0] || 0; // rotation angle in degrees
    transform.rotateX = values[1] || 0; // rotation center X (optional)
    transform.rotateY = values[2] || 0; // rotation center Y (optional)
  }

  return transform;
};

const parsePoints = (pointsStr: string): [number, number][] => {
  return pointsStr
    .trim()
    .split(/\s+/)
    .map((point) => {
      const [x, y] = point.split(",").map(Number);
      return [x || 0, y || 0] as [number, number];
    });
};

const parseColor = (colorStr: string) => {
  if (!colorStr || colorStr === "none") return rgb(0, 0, 0);

  // Handle hex colors
  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      // Short hex like #f0a
      const r = parseInt(hex[0]! + hex[0]!, 16) / 255;
      const g = parseInt(hex[1]! + hex[1]!, 16) / 255;
      const b = parseInt(hex[2]! + hex[2]!, 16) / 255;
      return rgb(r, g, b);
    } else if (hex.length === 6) {
      // Full hex like #ff00aa
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return rgb(r, g, b);
    }
  }

  // Handle rgb() and rgba() colors
  const rgbMatch = colorStr.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const values = rgbMatch[1]!.split(",").map((val) => parseFloat(val.trim()));
    if (values.length >= 3) {
      const r = Math.min(values[0]! / 255, 1);
      const g = Math.min(values[1]! / 255, 1);
      const b = Math.min(values[2]! / 255, 1);
      return rgb(r, g, b);
    }
  }

  // Handle named colors
  const namedColors: { [key: string]: [number, number, number] } = {
    black: [0, 0, 0],
    white: [1, 1, 1],
    red: [1, 0, 0],
    green: [0, 0.5, 0],
    blue: [0, 0, 1],
    yellow: [1, 1, 0],
    cyan: [0, 1, 1],
    magenta: [1, 0, 1],
    silver: [0.75, 0.75, 0.75],
    gray: [0.5, 0.5, 0.5],
    grey: [0.5, 0.5, 0.5],
    maroon: [0.5, 0, 0],
    olive: [0.5, 0.5, 0],
    lime: [0, 1, 0],
    aqua: [0, 1, 1],
    teal: [0, 0.5, 0.5],
    navy: [0, 0, 0.5],
    fuchsia: [1, 0, 1],
    purple: [0.5, 0, 0.5],
  };

  const color = namedColors[colorStr.toLowerCase()];
  if (color) {
    return rgb(color[0], color[1], color[2]);
  }

  // Default to black
  console.warn(`Unknown color: ${colorStr}, defaulting to black`);
  return rgb(0, 0, 0);
};

const getStyleValue = (style: string, property: string): string | null => {
  if (!style) return null;
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, "i");
  const match = style.match(regex);
  return match ? match[1]!.trim() : null;
};

// Path parsing functionality
interface PathOperation {
  type: "line" | "curve" | "move";
  start: { x: number; y: number };
  end: { x: number; y: number };
  controlPoints?: { x: number; y: number }[];
}

interface PathTransformOptions {
  transformX: number;
  transformY: number;
  pageHeight: number;
  currentTransform: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
    rotateX: number;
    rotateY: number;
  };
  scaleX: number;
  scaleY: number;
  applyRotation: (x: number, y: number) => { x: number; y: number };
}

const parseSvgPath = (
  pathData: string,
  transform: PathTransformOptions
): PathOperation[] => {
  const operations: PathOperation[] = [];
  const commands = parsePathData(pathData);

  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  const transformPoint = (x: number, y: number) => {
    const point = transform.applyRotation(x, y);
    return {
      x: transform.transformX + point.x * transform.scaleX,
      y:
        transform.pageHeight -
        (transform.transformY + point.y * transform.scaleY),
    };
  };

  for (const cmd of commands) {
    const { command, args } = cmd;

    switch (command.toLowerCase()) {
      case "m": {
        // Move to
        const isRelative = command === "m";
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentX + args[i]! : args[i]!;
          const y = isRelative ? currentY + args[i + 1]! : args[i + 1]!;

          if (i === 0) {
            // First move command
            currentX = x;
            currentY = y;
            startX = x;
            startY = y;
          } else {
            // Subsequent moves are treated as line commands
            const start = transformPoint(currentX, currentY);
            const end = transformPoint(x, y);
            operations.push({
              type: "line",
              start,
              end,
            });
            currentX = x;
            currentY = y;
          }
        }
        break;
      }

      case "l": {
        // Line to
        const isRelative = command === "l";
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentX + args[i]! : args[i]!;
          const y = isRelative ? currentY + args[i + 1]! : args[i + 1]!;

          const start = transformPoint(currentX, currentY);
          const end = transformPoint(x, y);
          operations.push({
            type: "line",
            start,
            end,
          });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "h": {
        // Horizontal line
        const isRelative = command === "h";
        for (const dx of args) {
          const x = isRelative ? currentX + dx! : dx!;

          const start = transformPoint(currentX, currentY);
          const end = transformPoint(x, currentY);
          operations.push({
            type: "line",
            start,
            end,
          });
          currentX = x;
        }
        break;
      }

      case "v": {
        // Vertical line
        const isRelative = command === "v";
        for (const dy of args) {
          const y = isRelative ? currentY + dy! : dy!;

          const start = transformPoint(currentX, currentY);
          const end = transformPoint(currentX, y);
          operations.push({
            type: "line",
            start,
            end,
          });
          currentY = y;
        }
        break;
      }

      case "c": {
        // Cubic Bezier curve
        const isRelative = command === "c";
        for (let i = 0; i < args.length; i += 6) {
          const x1 = isRelative ? currentX + args[i]! : args[i]!;
          const y1 = isRelative ? currentY + args[i + 1]! : args[i + 1]!;
          const x2 = isRelative ? currentX + args[i + 2]! : args[i + 2]!;
          const y2 = isRelative ? currentY + args[i + 3]! : args[i + 3]!;
          const x = isRelative ? currentX + args[i + 4]! : args[i + 4]!;
          const y = isRelative ? currentY + args[i + 5]! : args[i + 5]!;

          // For now, approximate curve with a line from start to end
          // In a more sophisticated implementation, you could break the curve into segments
          const start = transformPoint(currentX, currentY);
          const end = transformPoint(x, y);
          operations.push({
            type: "curve",
            start,
            end,
            controlPoints: [transformPoint(x1, y1), transformPoint(x2, y2)],
          });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "q": {
        // Quadratic Bezier curve
        const isRelative = command === "q";
        for (let i = 0; i < args.length; i += 4) {
          const x1 = isRelative ? currentX + args[i]! : args[i]!;
          const y1 = isRelative ? currentY + args[i + 1]! : args[i + 1]!;
          const x = isRelative ? currentX + args[i + 2]! : args[i + 2]!;
          const y = isRelative ? currentY + args[i + 3]! : args[i + 3]!;

          // Approximate curve with a line
          const start = transformPoint(currentX, currentY);
          const end = transformPoint(x, y);
          operations.push({
            type: "curve",
            start,
            end,
            controlPoints: [transformPoint(x1, y1)],
          });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "z": {
        // Close path
        const start = transformPoint(currentX, currentY);
        const end = transformPoint(startX, startY);
        operations.push({
          type: "line",
          start,
          end,
        });
        currentX = startX;
        currentY = startY;
        break;
      }

      default:
        console.warn(`Unsupported path command: ${command}`);
    }
  }

  return operations;
};

interface PathCommand {
  command: string;
  args: number[];
}

const parsePathData = (pathData: string): PathCommand[] => {
  const commands: PathCommand[] = [];
  const pathStr = pathData.trim();

  // Regular expression to match path commands and their arguments
  const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])[^MmLlHhVvCcSsQqTtAaZz]*/g;

  let match;
  while ((match = commandRegex.exec(pathStr)) !== null) {
    const commandStr = match[0]!;
    const command = commandStr[0]!;
    const argsStr = commandStr.slice(1).trim();

    // Parse the arguments (numbers)
    const args: number[] = [];
    if (argsStr) {
      // Split by spaces, commas, or sequences of whitespace
      const numbers = argsStr.split(/[\s,]+/).filter((s) => s.length > 0);
      for (const num of numbers) {
        const parsed = parseFloat(num);
        if (!isNaN(parsed)) {
          args.push(parsed);
        }
      }
    }

    commands.push({ command, args });
  }

  return commands;
};

// Approximate curves with line segments for better visual quality
const approximateCurve = (
  operation: PathOperation
): { start: { x: number; y: number }; end: { x: number; y: number } }[] => {
  const segments: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  }[] = [];
  const numSegments = 8; // Number of line segments to approximate the curve

  if (!operation.controlPoints || operation.controlPoints.length === 0) {
    // No control points, just return the straight line
    return [{ start: operation.start, end: operation.end }];
  }

  // Generate points along the curve using parametric equations
  const points: { x: number; y: number }[] = [operation.start];

  for (let i = 1; i <= numSegments; i++) {
    const t = i / numSegments;
    let point: { x: number; y: number };

    if (operation.controlPoints.length === 1) {
      // Quadratic Bezier curve
      const p0 = operation.start;
      const p1 = operation.controlPoints[0]!;
      const p2 = operation.end;

      point = {
        x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
        y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
      };
    } else {
      // Cubic Bezier curve
      const p0 = operation.start;
      const p1 = operation.controlPoints[0]!;
      const p2 = operation.controlPoints[1]!;
      const p3 = operation.end;

      point = {
        x:
          (1 - t) * (1 - t) * (1 - t) * p0.x +
          3 * (1 - t) * (1 - t) * t * p1.x +
          3 * (1 - t) * t * t * p2.x +
          t * t * t * p3.x,
        y:
          (1 - t) * (1 - t) * (1 - t) * p0.y +
          3 * (1 - t) * (1 - t) * t * p1.y +
          3 * (1 - t) * t * t * p2.y +
          t * t * t * p3.y,
      };
    }

    points.push(point);
  }

  // Convert points to line segments
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      start: points[i]!,
      end: points[i + 1]!,
    });
  }

  return segments;
};
