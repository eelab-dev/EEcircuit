import React, { JSX, useEffect, useRef, useState } from "react";
import { ColorRGBA, WebglLine, WebglPlot, WebglSquare } from "webgl-plot";
import type {
  ComplexDataType,
  RealDataType,
  ResultType,
} from "eecircuit-engine";
import {
  Box,
  Button,
  CheckboxCheckedChangeDetails,
  Flex,
  Grid,
  GridItem,
  HStack,
  SliderValueChangeDetails,
  Spacer,
} from "@chakra-ui/react";

import { Checkbox } from "./components/ui/checkbox.tsx";
import { Tag } from "./components/ui/tag.tsx";

import { Slider } from "./components/ui/slider.tsx";

import Axis from "./axis.tsx";
import { unitConvert2string } from "./sim/unitConverter.ts";
import { isComplex, ResultArrayType } from "./sim/simulationArray.ts";
import { DisplayDataType, mapD2W } from "./displayData.ts";
import { changeIntensity } from "./colors.ts";

type CursorState = {
  x: number;
  y: number;
  visible: boolean;
  name: string;
};

type PlotType = {
  resultArray?: ResultArrayType;
  displayData?: DisplayDataType[];
  theme: "light" | "dark";
  checkCallBack?: (name: string, checked: boolean) => void;
  selectAllCallback?: () => void;
  selectNoneCallback?: () => void;
  colorizeCallback?: () => void;
  onColorChange?: (name: string, color: { r: number; g: number; b: number }) => void;
  height?: string;
  initialCursors?: { a: CursorState; b: CursorState; m: CursorState };
  onCursorsChange?: (a: CursorState, b: CursorState, m: CursorState) => void;
};

type LineMinMaxType = {
  minY: number;
  maxYNeg: number;
  minYPos: number;
  maxY: number;
  minX: number;
  maxX: number;
};

type ScaleType = {
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
};

type MouseDrag = {
  started: boolean;
  dragInitialX: number;
  dragInitialY: number;
  dragOffsetOld: number;
  dragOffsetOldY: number;
};

type MouseZoom = {
  started: boolean;
  cursorDownX: number;
  cursorDownY: number;
  cursorOffsetX: number;
  cursorOffsetY: number;
  zoomOut: boolean;
};

type ZoomStatus = {
  scale: number;
  offset: number;
};

type CrossXY = {
  x: number;
  y: number;
};

type PlotOptions = {
  crosshair: boolean;
  sweepSlider: boolean;
  showPoints: boolean;
};

let wglp: WebglPlot;
let lineMinMax = [{ minY: 0, maxY: 1 }] as LineMinMaxType[];

const zoomRect = new WebglSquare(new ColorRGBA(0.8, 0.8, 0.2, 0.25));
const crossXLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);
const crossYLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);

// Cursor markers
const cursorXLineA = new WebglLine(new ColorRGBA(1, 0.5, 0, 1), 2);
const cursorYLineA = new WebglLine(new ColorRGBA(1, 0.5, 0, 1), 2);
const cursorXLineB = new WebglLine(new ColorRGBA(0, 0.8, 1, 1), 2);
const cursorYLineB = new WebglLine(new ColorRGBA(0, 0.8, 1, 1), 2);
const cursorXLineM = new WebglLine(new ColorRGBA(0.1, 0.9, 0.3, 1), 2);
const cursorYLineM = new WebglLine(new ColorRGBA(0.1, 0.9, 0.3, 1), 2);

const dotA = new WebglSquare(new ColorRGBA(1, 0.5, 0, 1));
const dotB = new WebglSquare(new ColorRGBA(0, 0.8, 1, 1));
const dotM = new WebglSquare(new ColorRGBA(0.1, 0.9, 0.3, 1));

function PlotArray({
  resultArray: resultArray,
  displayData,
  theme,
  checkCallBack,
  selectAllCallback,
  selectNoneCallback,
  colorizeCallback,
  onColorChange,
  height: heightProp,
  initialCursors,
  onCursorsChange,
}: PlotType): JSX.Element {
  const canvasMain = useRef<HTMLCanvasElement>(null);
  const canvasGrid = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  const prevResultArrayRef = useRef<typeof resultArray>(undefined);
  
  // Use refs for values needed in the render loop to avoid closure stales
  const cursorARef = useRef<CursorState>({ x: 0, y: 0, visible: false, name: "" });
  const cursorBRef = useRef<CursorState>({ x: 0, y: 0, visible: false, name: "" });
  const cursorMRef = useRef<CursorState>({ x: 0, y: 0, visible: false, name: "" });

  const [plotOptions, setPlotOptions] = useState<PlotOptions>({
    crosshair: true,
    sweepSlider: false,
    showPoints: true,
  });
  const [isSweep, SetIsSweep] = useState(false);
  const [isAxis, SetIsAxis] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: "curve" | "cursor"; name: string } | null>(null);
  const selectedItemRef = useRef<{ type: "curve" | "cursor"; name: string } | null>(null);
  useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);

  const [sliderValue, SetSliderValue] = useState(0);

  const [crossXY, setCrossXY] = useState<CrossXY>({ x: 0, y: 0 });

  // Cursor positions in physical coordinates for UI display
  const [cursorA, setCursorA] = useState<CursorState>(() => initialCursors?.a ?? { x: 0, y: 0, visible: false, name: "" });
  const [cursorB, setCursorB] = useState<CursorState>(() => initialCursors?.b ?? { x: 0, y: 0, visible: false, name: "" });
  const [cursorM, setCursorM] = useState<CursorState>(() => initialCursors?.m ?? { x: 0, y: 0, visible: false, name: "" });

  // Update refs when state changes
  useEffect(() => { cursorARef.current = cursorA; onCursorsChange?.(cursorA, cursorBRef.current, cursorMRef.current); }, [cursorA]);
  useEffect(() => { cursorBRef.current = cursorB; onCursorsChange?.(cursorARef.current, cursorB, cursorMRef.current); }, [cursorB]);
  useEffect(() => { cursorMRef.current = cursorM; onCursorsChange?.(cursorARef.current, cursorBRef.current, cursorM); }, [cursorM]);

  const [zoomStatus, setZoomStatus] = useState<ZoomStatus>({
    scale: 1,
    offset: 0,
  });

  const [mouseZoom, setMouseZoom] = useState<MouseZoom>({
    started: false,
    cursorDownX: 0,
    cursorDownY: 0,
    cursorOffsetX: 0,
    cursorOffsetY: 0,
    zoomOut: false,
  });
  const [mouseDrag, setMouseDrag] = useState<MouseDrag>({
    started: false,
    dragInitialX: 0,
    dragInitialY: 0,
    dragOffsetOld: 0,
    dragOffsetOldY: 0,
  });
  // Left-drag pan: track start position to distinguish click vs drag
  const leftDragRef = useRef<{ started: boolean; dragInitialX: number; dragInitialY: number; dragOffsetOld: number; dragOffsetOldY: number; startClientX: number; startClientY: number; isDragging: boolean; isZooming: boolean; longPressTimer: ReturnType<typeof setTimeout> | null }>({
    started: false, dragInitialX: 0, dragInitialY: 0, dragOffsetOld: 0, dragOffsetOldY: 0, startClientX: 0, startClientY: 0, isDragging: false, isZooming: false, longPressTimer: null,
  });
  // Right-drag continuous zoom-out: track last X position and anchor data point
  const rightDragRef = useRef<{ started: boolean; lastClientX: number; anchorDataX: number; anchorNormX: number }>({
    started: false, lastClientX: 0, anchorDataX: 0, anchorNormX: 0,
  });

  useEffect(() => {
    if (resultArray && resultArray.sweep.length > 1) {
      SetIsSweep(true);
    } else {
      SetIsSweep(false);
    }
  }, [resultArray]);

  useEffect(() => {
    if (canvasMain.current) {
      crossXLine.color =
        theme === "dark"
          ? new ColorRGBA(0.1, 1, 0.1, 1)
          : new ColorRGBA(0.05, 0.4, 0.05, 1);
      crossYLine.color =
        theme === "dark"
          ? new ColorRGBA(0.1, 1, 0.1, 1)
          : new ColorRGBA(0.1, 0.5, 0.1, 1);
      zoomRect.color =
        theme === "dark"
          ? new ColorRGBA(0.8, 0.8, 0.2, 0.25)
          : new ColorRGBA(0.1, 0.1, 0.4, 0.25);
    }
  }, [theme]);

  useEffect(() => {
    let resizeObserver: ResizeObserver;
    if (canvasMain.current) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvasMain.current.width =
        canvasMain.current.clientWidth * devicePixelRatio;
      canvasMain.current.height =
        canvasMain.current.clientHeight * devicePixelRatio;

      wglp = new WebglPlot(canvasMain.current, {
        powerPerformance: "high-performance",
      });

      resizeObserver = new ResizeObserver(() => {
        if (canvasMain.current && wglp) {
          const devicePixelRatio = window.devicePixelRatio || 1;
          canvasMain.current.width =
            canvasMain.current.clientWidth * devicePixelRatio;
          canvasMain.current.height =
            canvasMain.current.clientHeight * devicePixelRatio;
          wglp.viewport(
            0,
            0,
            canvasMain.current.width,
            canvasMain.current.height
          );
        }
      });
      resizeObserver.observe(canvasMain.current);

      let lastScaleX = 0;
      let lastScaleY = 0;
      const newFrame = () => {
        if (wglp && canvasMain.current) {
          const canvas = canvasMain.current;
          const aspect = canvas.width / canvas.height;

          // Update markers if scale changed to keep them circular and same size
          if (wglp.gScaleX !== lastScaleX || wglp.gScaleY !== lastScaleY) {
            const gapX = 6 / (canvas.width / 2) / wglp.gScaleX;
            const gapY = 6 / (canvas.height / 2) / wglp.gScaleY;
            const numCirclePoints = 10;

            wglp.linesData.forEach((line: any) => {
              if (line.isPoints && line.originalDataX && line.originalDataY) {
                const numPoints = line.originalDataX.length;
                for (let i = 0; i < numPoints; i++) {
                  const x = line.originalDataX[i];
                  const y = line.originalDataY[i];
                  const base = i * numCirclePoints;
                  for (let p = 0; p < numCirclePoints; p++) {
                    if (p === 0 || p === numCirclePoints - 1) {
                      line.setX(base + p, x);
                      line.setY(base + p, y);
                    } else {
                      const angle =
                        ((p - 1) / (numCirclePoints - 3)) * Math.PI * 2;
                      line.setX(base + p, x + Math.cos(angle) * gapX);
                      line.setY(base + p, y + Math.sin(angle) * gapY);
                    }
                  }
                }
              }
            });
            lastScaleX = wglp.gScaleX;
            lastScaleY = wglp.gScaleY;
          }

          // Update cursor lines based on physical coordinates (matching crosshair logic)
          const updateCursor = (c: CrossXY & { visible: boolean }, xl: WebglLine, yl: WebglLine, dot: WebglSquare) => {
            if (!wglp || !xl || !yl || !dot) return;
            
            if (c.visible) {
              // Use physical coordinates directly for lines (WebglPlot handles the scale/offset)
              xl.xy = new Float32Array([c.x, -1e10, c.x, 1e10]);
              yl.xy = new Float32Array([-1e10, c.y, 1e10, c.y]);
              xl.visible = true;
              yl.visible = true;
              
              // Restore the marker dot at the intersection
              const dx = 0.02 / wglp.gScaleX;
              const dy = (0.02 * aspect) / wglp.gScaleY;
              dot.setSquare(c.x - dx, c.y - dy, c.x + dx, c.y + dy);
              dot.visible = true;
            } else {
              xl.visible = false;
              yl.visible = false;
              dot.visible = false;
            }
          };

          updateCursor(cursorARef.current, cursorXLineA, cursorYLineA, dotA);
          updateCursor(cursorBRef.current, cursorXLineB, cursorYLineB, dotB);
          updateCursor(cursorMRef.current, cursorXLineM, cursorYLineM, dotM);

          // Highlight selected curve by brightening its color
          const sel = selectedItemRef.current;
          wglp.linesData.forEach((baseLine: any) => {
            if (!baseLine._origColor) return;
            const orig = baseLine._origColor;
            if (sel?.type === "curve" && sel.name === baseLine._name) {
              baseLine.color = new ColorRGBA(
                Math.min(orig.r * 2.5, 1),
                Math.min(orig.g * 2.5, 1),
                Math.min(orig.b * 2.5, 1),
                1
              );
            } else {
              baseLine.color = new ColorRGBA(orig.r, orig.g, orig.b, orig.a);
            }
          });

          wglp.update();
          animationFrameId.current = requestAnimationFrame(newFrame);
        }
      };
      animationFrameId.current = requestAnimationFrame(newFrame);

      //bug fix see https://github.com/facebook/react/issues/14856#issuecomment-586781399
      canvasMain.current.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
        },
        { passive: false }
      );
    }
    console.log("canvas->", "I am here! 🧨");
    ////bug fix see https://github.com/facebook/react/issues/14856#issuecomment-586781399
    return () => {
      resizeObserver?.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      canvasMain.current?.removeEventListener("wheel", (e) => {
        e.preventDefault();
      });
    };
  }, [canvasMain]);

  useEffect(() => {
    setZoomStatus({
      scale: wglp.gScaleX,
      offset: wglp.gOffsetX / wglp.gScaleX,
    });
  }, [mouseDrag]);

  // Redraw Canvas 2D grid whenever zoom/pan or scale changes
  useEffect(() => {
    const canvas = canvasGrid.current;
    if (!canvas || !wglp) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = theme === "light" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    const NUM_GRID = 5;
    for (let i = 0; i < NUM_GRID; i++) {
      const norm = -1 + (2 / (NUM_GRID + 1)) * (i + 1);
      // norm is in WebGL clip space (-1..1); convert to canvas pixel coords
      const px = ((norm + 1) / 2) * canvas.width;
      const py = ((1 - norm) / 2) * canvas.height;
      // vertical line
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke();
      // horizontal line
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(canvas.width, py); ctx.stroke();
    }
  }, [zoomStatus, theme, canvasGrid]);

  /////////////////////////////////////////////////////////////////////

  const makeLine = (results: ResultType[]) => {
    lineMinMax = [];
    results.forEach((result) => {
      if (result.dataType == "real") {
        getLineMinMaxNormal(result.data);
      }
      if (result.dataType == "complex") {
        getLineMinMaxComplex(result.data);
      }
    });
  };

  /*const complexLine = (results: ResultType[]) => {
    lineMinMax = [];
    results.forEach((result) => {
      const data = result.data;
      getLineMinMaxComplex(data as ComplexDataType);
    });
  };*/

  const getLineMinMaxNormal = (data: RealDataType[]) => {
    const numPoints = data[0].values.length;
    // ignore the first element of the data array which is the x-axis
    for (let col = 1; col < data.length; col++) {
      let color: ColorRGBA;
      if (displayData && displayData[col - 1]) {
        color = new ColorRGBA(
          displayData[col - 1].color.r,
          displayData[col - 1].color.g,
          displayData[col - 1].color.b,
          1
        );
      } else {
        color = new ColorRGBA(0.5, 0.5, 0.5, 1);
      }
      
      const line = new WebglLine(color, numPoints);
      // Tag line with metadata for easier visibility control and selection
      (line as any).sourceIndex = col - 1;
      (line as any).isPoints = false;
      (line as any)._origColor = { r: color.r, g: color.g, b: color.b, a: color.a };
      (line as any)._name = displayData?.[col - 1]?.name ?? "";

      let minY = 100000;
      let maxY = -100000;
      let minPos = maxY;
      let maxNeg = minY;

      for (let i = 0; i < numPoints; i++) {
        const x = data[0].values[i];
        const y = data[col].values[i];
        line.setX(i, x);
        line.setY(i, y);
        maxY = maxY > y ? maxY : y;
        minY = minY < y ? minY : y;
        minPos = minY < y && y > 0 ? minPos : y;
        maxNeg = maxY > y && y < 0 ? maxNeg : y;
      }

      wglp.addDataLine(line);
      
      if (plotOptions.showPoints && canvasMain.current) {
        const canvas = canvasMain.current;
        const numCirclePoints = 10;
        const pointsLine = new WebglLine(color, numPoints * numCirclePoints);
        (pointsLine as any).sourceIndex = col - 1;
        (pointsLine as any).isPoints = true;
        (pointsLine as any).originalDataX = data[0].values;
        (pointsLine as any).originalDataY = data[col].values;
        
        const gapX = (6 / (canvas.width / 2)) / wglp.gScaleX;
        const gapY = (6 / (canvas.height / 2)) / wglp.gScaleY;

        for (let i = 0; i < numPoints; i++) {
          const x = data[0].values[i];
          const y = data[col].values[i];
          const base = i * numCirclePoints;
          for (let p = 0; p < numCirclePoints; p++) {
            if (p === 0 || p === numCirclePoints - 1) {
              pointsLine.setX(base + p, x);
              pointsLine.setY(base + p, y);
            } else {
              const angle = ((p - 1) / (numCirclePoints - 3)) * Math.PI * 2;
              pointsLine.setX(base + p, x + Math.cos(angle) * gapX);
              pointsLine.setY(base + p, y + Math.sin(angle) * gapY);
            }
          }
        }
        wglp.addDataLine(pointsLine);
      }

      lineMinMax.push({
        minY: minY,
        maxY: maxY,
        minYPos: minPos,
        maxYNeg: maxNeg,
        minX: data[0].values[0],
        maxX: data[0].values[numPoints - 1],
      });
    }
  };

  const getLineMinMaxComplex = (data: ComplexDataType[]) => {
    const drawLine = (dataY: number[], dataX: number[], index: number) => {
      let color: ColorRGBA;
      if (displayData && displayData[index - 1]) {
        color = new ColorRGBA(
          displayData[index - 1].color.r,
          displayData[index - 1].color.g,
          displayData[index - 1].color.b,
          1
        );
      } else {
        color = new ColorRGBA(0.5, 0.5, 0.5, 1);
      }
      const line = new WebglLine(color, dataX.length);
      let minY = 100000;
      let maxY = -100000;
      let minPos = maxY;
      let maxNeg = minY;

      for (let i = 0; i < dataX.length; i++) {
        line.setX(i, dataX[i]);
        const y = dataY[i];
        line.setY(i, y);
        maxY = maxY > y ? maxY : y;
        minY = minY < y ? minY : y;
        minPos = minY < y && y > 0 ? minPos : y;
        maxNeg = maxY > y && y < 0 ? maxNeg : y;
      }

      wglp.addDataLine(line);
      lineMinMax.push({
        minY: minY,
        maxY: maxY,
        minYPos: minPos,
        maxYNeg: maxNeg,
        minX: dataX[0],
        maxX: dataX[dataX.length - 1],
      });
    };

    const dataXReal = [] as number[];

    data[0].values.forEach((value) => {
      dataXReal.push(value.real);
    });

    for (let col = 1; col < data.length; col++) {
      const dataYMag = [] as number[];
      const dataYPhase = [] as number[];
      data[col].values.forEach((value) => {
        dataYMag.push(
          Math.sqrt(Math.pow(value.real, 2) + Math.pow(value.img, 2))
        );
        dataYPhase.push((Math.atan2(value.img, value.real) * 180) / Math.PI);
      });
      drawLine(dataYMag, dataXReal, 2 * col - 1);
      drawLine(dataYPhase, dataXReal, 2 * col);
    }
  };

  useEffect(() => {
    if (!wglp) return;

    wglp.removeAllLines();

    if (resultArray && resultArray.results.length > 0) {
      makeLine(resultArray.results);

      // Map displayData for faster lookup
      const visibilityMap = new Map<number, boolean>();
      displayData?.forEach((e) => {
        visibilityMap.set(e.index, e.visible);
      });

      // Update visibility using the tagged metadata
      const offset = isComplex(resultArray) ? 2 : 1;
      wglp.linesData.forEach((line: any) => {
        if (line.sourceIndex !== undefined) {
          const isVisible = visibilityMap.get(line.sourceIndex + offset);
          line.visible = isVisible !== undefined ? isVisible : true;
        }
      });

      // Only reset view when new simulation data arrives, not on visibility/color/points changes
      if (resultArray !== prevResultArrayRef.current) {
        scaleUpdate(findMinMaxGlobal());
        prevResultArrayRef.current = resultArray;
      }
    }

    // Re-add auxiliary elements
    wglp.addSurface(zoomRect);
    wglp.addAuxLine(crossXLine);
    wglp.addAuxLine(crossYLine);
    wglp.addAuxLine(cursorXLineA);
    wglp.addAuxLine(cursorYLineA);
    wglp.addAuxLine(cursorXLineB);
    wglp.addAuxLine(cursorYLineB);
    wglp.addAuxLine(cursorXLineM);
    wglp.addAuxLine(cursorYLineM);
    wglp.addSurface(dotA);
    wglp.addSurface(dotB);
    wglp.addSurface(dotM);

    cursorXLineA.visible = cursorA.visible;
    cursorYLineA.visible = cursorA.visible;
    cursorXLineB.visible = cursorB.visible;
    cursorYLineB.visible = cursorB.visible;
    cursorXLineM.visible = cursorM.visible;
    cursorYLineM.visible = cursorM.visible;

    if (!resultArray || resultArray.results.length === 0) {
      wglp.gOffsetX = -1;
      wglp.gScaleX = 2;
    }
  }, [resultArray, displayData, plotOptions.showPoints]);

  // Remove the redundant second useEffect for visibility

  const findMinMaxGlobal = (): ScaleType => {
    let minY = 1e6;
    let maxY = -1e6;
    let minX = 0;
    let maxX = 1;

    for (let i = 0; i < wglp.linesData.length; i++) {
      const line = wglp.linesData[i] as any;
      if (line.visible && !line.isPoints) {
        // Find corresponding entry in lineMinMax
        // lineMinMax is populated per variable, so we use sourceIndex
        const e = lineMinMax[line.sourceIndex];
        if (e) {
          maxY = maxY > e.maxY ? maxY : e.maxY;
          minY = minY < e.minY ? minY : e.minY;
        }
      }
    }
    if (lineMinMax[0]) {
      minX = lineMinMax[0].minX;
      maxX = lineMinMax[0].maxX;
    }

    const minmax = { minY: minY, maxY: maxY, minX: minX, maxX: maxX };
    return minmax;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "b" || key === "m") {
        if (!wglp || wglp.linesData.length === 0) return;

        // Find closest point among visible lines
        let bestPoint = { x: 0, y: 0 };
        let bestName = "";
        let minDistanceSq = Infinity;
        let found = false;

        wglp.linesData.forEach((baseLine) => {
          if (!baseLine.visible) return;
          const line = baseLine as WebglLine;

          const numPoints = line.numPoints;
          let localBestX = 0;
          let localBestY = 0;
          let localMinDX = Infinity;

          for (let i = 0; i < numPoints; i++) {
            const px = line.getX(i);
            const py = line.getY(i);
            const dx = Math.abs(px - crossXY.x);
            if (dx < localMinDX) {
              localMinDX = dx;
              localBestX = px;
              localBestY = py;
            }
          }

          if (localMinDX !== Infinity) {
            const distSq = (localBestX - crossXY.x) ** 2 + (localBestY - crossXY.y) ** 2;
            if (distSq < minDistanceSq) {
              minDistanceSq = distSq;
              bestPoint = { x: localBestX, y: localBestY };
              // Resolve signal name from displayData via sourceIndex
              const srcIdx = (line as any).sourceIndex;
              const offset = isComplex(resultArray) ? 2 : 1;
              const dd = displayData?.find(d => d.index === srcIdx + offset);
              bestName = dd ? dd.name : "";
              found = true;
            }
          }
        });

        if (found) {
          if (key === "a") {
            setCursorA({ ...bestPoint, visible: true, name: bestName });
          } else if (key === "b") {
            setCursorB({ ...bestPoint, visible: true, name: bestName });
          } else {
            setCursorM({ ...bestPoint, visible: true, name: bestName });
          }
        }
      }

      // 'c' to clear cursors
      if (key === "c") {
        setCursorA(prev => ({ ...prev, visible: false }));
        setCursorB(prev => ({ ...prev, visible: false }));
        setCursorM(prev => ({ ...prev, visible: false }));
      }

      // 'f' to reset view
      if (key === "f") {
        scaleUpdate(findMinMaxGlobal());
      }

      // '[' to zoom out, ']' to zoom in (X axis, centered on current view)
      if (key === "[" || key === "]") {
        const factor = key === "]" ? 1.2 : 1 / 1.2;
        const center = -wglp.gOffsetX / wglp.gScaleX;
        wglp.gScaleX *= factor;
        wglp.gOffsetX = -center * wglp.gScaleX;
      }

      // Delete — remove selected item
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = selectedItemRef.current;
        if (sel?.type === "cursor") {
          if (sel.name === "A") setCursorA(prev => ({ ...prev, visible: false }));
          else if (sel.name === "B") setCursorB(prev => ({ ...prev, visible: false }));
          else if (sel.name === "M") setCursorM(prev => ({ ...prev, visible: false }));
          setSelectedItem(null);
        } else if (sel?.type === "curve" && checkCallBack) {
          checkCallBack(sel.name, false);
          setSelectedItem(null);
        }
      }

      // Escape — deselect
      if (e.key === "Escape") {
        setSelectedItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [crossXY]);

  const scaleUpdate = (scale: ScaleType) => {
    let diffY = 0;
    let avgY = 0;
    if (scale.minY == scale.maxY) {
      const c = scale.minY;
      diffY = 0.1 * c;
      avgY = c;
    } else {
      diffY = scale.maxY - scale.minY;
      avgY = (scale.minY + scale.maxY) / 2;
    }
    wglp.gScaleY = 1.9 / Math.abs(diffY);
    wglp.gOffsetY = -1 * avgY * wglp.gScaleY;

    wglp.gScaleX = 2 / (scale.maxX - scale.minX);
    wglp.gOffsetX = -wglp.gScaleX * scale.minX - 1;

    //??????????????????????????????????????????????????????????????????????

    /*wglp.gScaleY = 0.1;
    wglp.gOffsetY = 0;
    wglp.gScaleX = 0.1;
    wglp.gOffsetX = 0;*/
  };

  const mouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const eOffset = rect.x;
    const width = rect.width;
    const height = rect.height;

    // Shared select logic — only updates selection if something is hit, never deselects
    const trySelect = () => {
      if (!wglp) return;
      const normX = ((e.clientX - rect.left) / width) * 2 - 1;
      const normY = 1 - ((e.clientY - rect.top) / height) * 2;
      const dataX = (normX - wglp.gOffsetX) / wglp.gScaleX;
      const dataY = (normY - wglp.gOffsetY) / wglp.gScaleY;
      const threshX = 25 / (width / 2) / wglp.gScaleX;
      const threshY = 25 / (height / 2) / wglp.gScaleY;

      // Check cursor dots first
      const cursors: Array<{ key: string; state: CursorState }> = [
        { key: "A", state: cursorARef.current },
        { key: "B", state: cursorBRef.current },
        { key: "M", state: cursorMRef.current },
      ];
      for (const { key, state } of cursors) {
        if (state.visible && Math.abs(dataX - state.x) < threshX * 2 && Math.abs(dataY - state.y) < threshY * 2) {
          setSelectedItem({ type: "cursor", name: key });
          return;
        }
      }

      // Check curves — convert to screen pixels, find closest named non-points line
      const toScreenX = (dx: number) => (dx * wglp.gScaleX + wglp.gOffsetX + 1) / 2 * width;
      const toScreenY = (dy: number) => (1 - (dy * wglp.gScaleY + wglp.gOffsetY)) / 2 * height;
      const clickScreenX = (e.clientX - rect.left);
      const clickScreenY = (e.clientY - rect.top);
      let bestName = "";
      let bestDist = Infinity;
      wglp.linesData.forEach((baseLine: any) => {
        if (!baseLine.visible) return;
        if (baseLine.isPoints) return;
        if (!baseLine._name) return;
        const line = baseLine as WebglLine;
        for (let i = 0; i < line.numPoints; i++) {
          const sx = toScreenX(line.getX(i)) - clickScreenX;
          const sy = toScreenY(line.getY(i)) - clickScreenY;
          const dist = sx * sx + sy * sy;
          if (dist < bestDist) { bestDist = dist; bestName = baseLine._name ?? ""; }
        }
      });
      if (bestName) setSelectedItem({ type: "curve", name: bestName });
    };

    // Left click: selection only
    if (e.button == 0) {
      leftDragRef.current = {
        started: true,
        dragInitialX: 0, dragInitialY: 0, dragOffsetOld: 0, dragOffsetOldY: 0,
        startClientX: e.clientX, startClientY: e.clientY,
        isDragging: false, isZooming: false, longPressTimer: null,
      };
    }

    // Right click: X-axis zoom-in rectangle + select
    if (e.button == 2) {
      (e.target as HTMLCanvasElement).style.cursor = "crosshair";
      const cursorDownX = (2 * (e.clientX - eOffset - width / 2)) / width;
      setMouseZoom({ started: true, cursorDownX, cursorDownY: 0, cursorOffsetX: 0, cursorOffsetY: 0, zoomOut: false });
      zoomRect.visible = true;
      trySelect();
    }

    // Middle click: pan X+Y
    if (e.button == 1) {
      (e.target as HTMLCanvasElement).style.cursor = "grabbing";
      setMouseDrag({
        started: true,
        dragInitialX: (e.clientX - eOffset) * devicePixelRatio,
        dragInitialY: (e.clientY - rect.top) * devicePixelRatio,
        dragOffsetOld: wglp.gOffsetX,
        dragOffsetOldY: wglp.gOffsetY,
      });
    }
  };

  const mouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const xOffset = (e.target as HTMLCanvasElement).getBoundingClientRect()
      .left;
    const yOffSet = (e.target as HTMLCanvasElement).getBoundingClientRect().top;
    const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
    const height = (e.target as HTMLCanvasElement).getBoundingClientRect()
      .height;
    if (mouseZoom.started) {
      const cursorOffsetX = (2 * (e.clientX - xOffset - width / 2)) / width;
      setMouseZoom({
        started: true,
        cursorDownX: mouseZoom.cursorDownX,
        cursorDownY: 0,
        cursorOffsetX,
        cursorOffsetY: 0,
        zoomOut: mouseZoom.zoomOut,
      });
      const z1 = (mouseZoom.cursorDownX - wglp.gOffsetX) / wglp.gScaleX;
      const z2 = (cursorOffsetX - wglp.gOffsetX) / wglp.gScaleX;
      zoomRect.setSquare(z1, -1000, z2, 1000);
      /*zoomRect.xy = new Float32Array([
        (mouseZoom.cursorDownX - wglp.gOffsetX) / wglp.gScaleX,
        -100,
        (mouseZoom.cursorDownX - wglp.gOffsetX) / wglp.gScaleX,
        100,
        (cursorOffsetX - wglp.gOffsetX) / wglp.gScaleX,
        100,
        (cursorOffsetX - wglp.gOffsetX) / wglp.gScaleX,
        -100,
      ]);*/
      zoomRect.visible = true;
    }
    /************Mouse Drag Event (middle click) ********* */
    if (mouseDrag.started) {
      const moveX = (e.clientX - xOffset) * devicePixelRatio - mouseDrag.dragInitialX;
      const moveY = (e.clientY - yOffSet) * devicePixelRatio - mouseDrag.dragInitialY;
      wglp.gOffsetX = moveX / width + mouseDrag.dragOffsetOld;
      wglp.gOffsetY = -(moveY / height) + mouseDrag.dragOffsetOldY;
    }

    /************Right-drag: zoom rect (handled by mouseZoom state) ********* */
    /*****************cross hair************** */

    const canvas = canvasMain.current;

    if (canvas && plotOptions.crosshair) {
      const xPosRel = (2 * (e.clientX - xOffset - width / 2)) / width;
      const x = (1 / wglp.gScaleX) * (xPosRel - wglp.gOffsetX);
      //console.log("cross-->", xPosRel, "--> ", x);

      const yPosRel = 1 - (2 * (e.clientY - yOffSet)) / height;
      const y = (1 / wglp.gScaleY) * (yPosRel - wglp.gOffsetY);

      cross(x, y);
    }
  };
  const cross = (x: number, y: number): void => {
    crossXLine.xy = new Float32Array([x, -1000, x, 1000]);
    crossYLine.xy = new Float32Array([-1000, y, 1000, y]);
    setCrossXY({ x: x, y: y });
  };

  const mouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Left click up: select only
    if (e.button == 0 && leftDragRef.current.started && wglp) {
      const normX = ((e.clientX - rect.left) / width) * 2 - 1;
      const normY = 1 - ((e.clientY - rect.top) / height) * 2;
      const dataX = (normX - wglp.gOffsetX) / wglp.gScaleX;
      const dataY = (normY - wglp.gOffsetY) / wglp.gScaleY;
      const threshX = 25 / (width / 2) / wglp.gScaleX;
      const threshY = 25 / (height / 2) / wglp.gScaleY;
      let hit = false;
      for (const { key, state } of [
        { key: "A", state: cursorARef.current },
        { key: "B", state: cursorBRef.current },
        { key: "M", state: cursorMRef.current },
      ] as Array<{ key: string; state: CursorState }>) {
        if (state.visible && Math.abs(dataX - state.x) < threshX * 2 && Math.abs(dataY - state.y) < threshY * 2) {
          setSelectedItem({ type: "cursor", name: key });
          hit = true;
          break;
        }
      }
      if (!hit) {
        const toScreenX = (dx: number) => (dx * wglp.gScaleX + wglp.gOffsetX + 1) / 2 * width;
        const toScreenY = (dy: number) => (1 - (dy * wglp.gScaleY + wglp.gOffsetY)) / 2 * height;
        const clickScreenX = e.clientX - rect.left;
        const clickScreenY = e.clientY - rect.top;
        let bestName = "";
        let bestDist = Infinity;
        wglp.linesData.forEach((baseLine: any) => {
          if (!baseLine.visible) return;
          if (baseLine.isPoints) return;
          if (!baseLine._name) return;
          const line = baseLine as WebglLine;
          for (let i = 0; i < line.numPoints; i++) {
            const sx = toScreenX(line.getX(i)) - clickScreenX;
            const sy = toScreenY(line.getY(i)) - clickScreenY;
            const dist = sx * sx + sy * sy;
            if (dist < bestDist) { bestDist = dist; bestName = baseLine._name ?? ""; }
          }
        });
        console.log(`[SELECT] result="${bestName}" bestDist=${Math.sqrt(bestDist).toFixed(1)}px`);
        if (bestName) setSelectedItem({ type: "curve", name: bestName });
      }
      leftDragRef.current.started = false;
    }

    // Stop right-click zoom rect — X-axis zoom only
    if (e.button == 2) {
      if (mouseZoom.started) {
        const cursorUpX = (2 * (e.clientX - rect.left - width / 2)) / width;
        const dragDistX = Math.abs(cursorUpX - mouseZoom.cursorDownX);
        if (dragDistX > 0.03) {
          const zoomFactor = dragDistX / (2 * wglp.gScaleX);
          const offsetFactor = (mouseZoom.cursorDownX + cursorUpX - 2 * wglp.gOffsetX) / (2 * wglp.gScaleX);
          wglp.gScaleX = 1 / zoomFactor;
          wglp.gOffsetX = -offsetFactor / zoomFactor;
        }
        setMouseZoom({ started: false, cursorDownX: 0, cursorDownY: 0, cursorOffsetX: 0, cursorOffsetY: 0, zoomOut: false });
        zoomRect.visible = false;
      }
    }

    // Stop middle-click pan
    setMouseDrag({ started: false, dragInitialX: 0, dragInitialY: 0, dragOffsetOld: 0, dragOffsetOldY: 0 });
    (e.target as HTMLCanvasElement).style.cursor = "grab";
    zoomRect.visible = false;
  };

  const doubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  function wheelEvent(e: React.WheelEvent<HTMLCanvasElement>) {
    // On macOS, Shift+scroll swaps deltaY to deltaX, so use whichever is non-zero
    const delta = e.shiftKey ? (e.deltaX || e.deltaY) : e.deltaY;

    const canvas = canvasMain.current;
    if (!canvas) return;

    // Convert mouse position to normalized canvas coordinates (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    const mouseNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseNormY = 1 - ((e.clientY - rect.top) / rect.height) * 2;

    if (e.shiftKey) {
      // Shift+scroll: Y-axis zoom centered on mouse Y position
      const oldScaleY = wglp.gScaleY;
      let newScaleY = oldScaleY;
      if (delta < 0) {
        newScaleY = oldScaleY + -1 * delta * (oldScaleY * 0.001);
      } else {
        newScaleY = oldScaleY - delta * (oldScaleY * 0.001);
      }
      // Keep data point under mouse fixed: mouseNormY = dataY * newScaleY + newOffsetY
      const dataY = (mouseNormY - wglp.gOffsetY) / oldScaleY;
      wglp.gScaleY = newScaleY;
      wglp.gOffsetY = mouseNormY - dataY * newScaleY;
    } else {
      // Normal scroll: X-axis zoom centered on mouse X position
      const oldScaleX = wglp.gScaleX;
      let newScaleX = oldScaleX;
      if (delta < 0) {
        newScaleX = oldScaleX + -1 * delta * (oldScaleX * 0.001);
      } else {
        newScaleX = oldScaleX - delta * (oldScaleX * 0.001);
      }
      // Keep data point under mouse fixed: mouseNormX = dataX * newScaleX + newOffsetX
      const dataX = (mouseNormX - wglp.gOffsetX) / oldScaleX;
      wglp.gScaleX = newScaleX;
      wglp.gOffsetX = mouseNormX - dataX * newScaleX;
    }
  }

  const contextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const crosshairBoxHandle = (e: CheckboxCheckedChangeDetails) => {
    const o = { ...plotOptions };
    o.crosshair = e.checked === true;
    setPlotOptions(o);
  };

  const pointsBoxHandle = (e: CheckboxCheckedChangeDetails) => {
    const o = { ...plotOptions };
    o.showPoints = e.checked === true;
    setPlotOptions(o);
  };

  useEffect(() => {
    crossXLine.visible = plotOptions.crosshair;
    crossYLine.visible = plotOptions.crosshair;
    const canvas = canvasMain.current;
    if (canvas) {
      canvas.style.cursor = plotOptions.crosshair ? "crosshair" : "hand";
    }
  }, [plotOptions]);

  const axisBoxHandle = (e: CheckboxCheckedChangeDetails) => {
    SetIsAxis(e.checked === true);
  };

  const sweepCheckBoxHandle = (e: CheckboxCheckedChangeDetails) => {
    const o = { ...plotOptions };
    o.sweepSlider = e.checked === true;
    setPlotOptions(o);
  };

  const handleSweepSlider = (e: SliderValueChangeDetails) => {
    //console.log(displayData);
    const value = e.value[0];
    if (displayData && resultArray) {
      displayData.forEach((e) => {
        if (e.visible) {
          for (let s = 0; s < resultArray.sweep.length; s++) {
            const wIndex = mapD2W(e.index, s, displayData, resultArray);
            wglp.linesData[wIndex].color = changeIntensity(e.color, 0.5, 0.5);
          }
          const wIndex = mapD2W(e.index, value, displayData, resultArray);
          wglp.linesData[wIndex].color = changeIntensity(e.color, 1, 1);
        }
      });
    }
    if (resultArray) {
      const n = resultArray.sweep[value];
      SetSliderValue(n);
    }
  };

  const canvasStyle = {
    width: "100%",
    height: heightProp ?? "40vh",
  } as React.CSSProperties;

  /*const handleLog10YCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    wglp.gLog10Y = e.target.checked;

    if (e.target.checked) {
      const a = { ...findMinMaxGlobalLog10() };
      //console.log("log->", a);
      scaleUpdate({ minY: Math.log10(a.minY), maxY: Math.log10(a.maxY) } as ScaleType);
    } else {
      const a = { ...findMinMaxGlobal() };
      scaleUpdate({ minY: a.minY, maxY: a.maxY } as ScaleType);
    }
  };*/

  /*const findMinMaxGlobalLog10 = (): ScaleType => {
    //???????????????????????
    let minPos = 10000;
    let maxY = -10000;

    for (let i = 0; i < wglp.linesData.length; i++) {
      if (wglp.linesData[i].visible) {
        const e = lineMinMax[i];
        maxY = maxY > e.maxY ? maxY : e.maxY;
        minPos = minPos < e.minYPos ? minPos : e.minYPos;
      }
    }
    return { minY: minPos, maxY: maxY, minX: lineMinMax[0].minX, maxX: lineMinMax[0].maxX };
  };*/

  return (
    <>
      <Flex align="center" width="100%" mb={2}>
        <HStack gap={4}>
          <Checkbox defaultChecked={true} onCheckedChange={axisBoxHandle}>
            Axis
          </Checkbox>
          <Checkbox defaultChecked onCheckedChange={crosshairBoxHandle}>
            Crosshair
          </Checkbox>
          <Checkbox
            defaultChecked={true}
            onCheckedChange={pointsBoxHandle}
          >
            Points
          </Checkbox>

          <Button size="xs" colorScheme="blue" variant="outline" onClick={() => scaleUpdate(findMinMaxGlobal())}>
            Fit (f)
          </Button>

          <Box position="relative">
            <Button size="xs" variant="outline" onClick={() => setShowShortcuts(s => !s)}>
              Shortcuts
            </Button>
            {showShortcuts && (
              <Box
                position="absolute"
                top="110%"
                left={0}
                zIndex={100}
                bg="bg.panel"
                border="1px solid"
                borderColor="border.muted"
                borderRadius="md"
                boxShadow="md"
                p={3}
                minWidth="260px"
                maxHeight="220px"
                overflowY="auto"
                fontSize="xs"
                lineHeight="1.8"
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <Box fontWeight="bold">Keyboard Shortcuts</Box>
                  <Button size="xs" variant="ghost" onClick={() => setShowShortcuts(false)}>✕</Button>
                </Flex>
                <Box><b>a</b> / <b>b</b> / <b>m</b> — place cursor A / B / M on nearest curve</Box>
                <Box><b>c</b> — clear cursors</Box>
                <Box><b>f</b> — fit view</Box>
                <Box><b>[</b> / <b>]</b> — zoom out / zoom in (X axis)</Box>
                <Box><b>Click curve/cursor</b> — select it (highlights)</Box>
                <Box><b>Delete</b> — remove selected curve/cursor</Box>
                <Box><b>Esc</b> — deselect</Box>
                <Box><b>Scroll</b> — zoom X axis</Box>
                <Box><b>Shift + Scroll</b> — zoom Y axis</Box>
                <Box><b>Left-click</b> — select curve/marker</Box>
                <Box><b>Right-click drag</b> — zoom in X axis</Box>
                <Box><b>Middle-click drag</b> — pan X+Y</Box>
              </Box>
            )}
          </Box>
        </HStack>

        <Spacer />

        <HStack gap={2}>
          {plotOptions.crosshair && (
            <>
              <Tag w="7em" colorScheme="teal">
                {`X: ${unitConvert2string(crossXY.x, 3)}`}
              </Tag>
              <Tag w="7em" colorScheme="teal">
                {`Y: ${unitConvert2string(crossXY.y, 3)}`}
              </Tag>
            </>
          )}

          {checkCallBack && (
            <Checkbox
              checked={showLegend}
              onCheckedChange={(e) => setShowLegend(e.checked === true)}
            >
              Legend
            </Checkbox>
          )}
        </HStack>
      </Flex>

      {isSweep ? (
        <HStack mb={2}>
          <Checkbox
            defaultChecked={false}
            onCheckedChange={sweepCheckBoxHandle}
          >
            Sweep slider
          </Checkbox>
          {plotOptions.sweepSlider && (
            <Tag colorScheme="teal">
              {`${unitConvert2string(sliderValue, 3)}`}
            </Tag>
          )}
        </HStack>
      ) : null}

      {plotOptions.sweepSlider && isSweep ? (
        <Slider
          defaultValue={[0]}
          min={0}
          max={resultArray ? resultArray.sweep.length - 1 : 0}
          onValueChange={handleSweepSlider}
        />
      ) : (
        <></>
      )}

      {/* Plot area with optional overlay legend */}
      <Box position="relative">
        <Grid
          templateRows={`${isAxis ? 1.5 : 0}em 1fr`}
          templateColumns={`${isAxis ? 5 : 0}em 1fr`}
          gap={0}
        >
          <GridItem
            rowStart={1}
            colStart={1}
            bg="bg.subtle"
            borderBottom="solid 2px"
            borderRight="solid 2px"
          />
          <GridItem
            rowStart={1}
            colStart={2}
            bg="bg.subtle"
            borderBottom={`${isAxis ? "solid 2px" : ""}`}
          >
            {isAxis ? (
              <Axis
                scale={wglp ? wglp.gScaleX : 1}
                offset={wglp ? wglp.gOffsetX : 0}
                axis="x"
                yHeight={canvasStyle.height as string}
                theme={theme}
              />
            ) : (
              <></>
            )}
          </GridItem>
          <GridItem
            rowStart={2}
            colStart={1}
            bg="bg.subtle"
            borderRight="solid 2px"
          >
            {isAxis ? (
              <Axis
                scale={wglp ? wglp.gScaleY : 1}
                offset={wglp ? wglp.gOffsetY : 0}
                axis="y"
                yHeight={canvasStyle.height as string}
                theme={theme}
              />
            ) : (
              <></>
            )}
          </GridItem>
          <GridItem rowStart={2} colStart={2} bg="papayawhip">
            <Box bg="bg.subtle" height="100%" position="relative">
              <canvas
                ref={canvasMain}
                style={canvasStyle}
                onMouseDown={mouseDown}
                onMouseMove={mouseMove}
                onMouseUp={mouseUp}
                onDoubleClick={doubleClick}
                onWheel={wheelEvent}
                onContextMenu={contextMenu}
              ></canvas>
              <canvas
                ref={canvasGrid}
                style={{ ...canvasStyle, position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              />
              {selectedItem && (() => {
                let bg = "#ECC94B"; // yellow
                let color = "black";
                if (selectedItem.type === "cursor") {
                  bg = selectedItem.name === "A" ? "#ED8936" : selectedItem.name === "B" ? "#4299E1" : "#48BB78";
                  color = "white";
                } else {
                  const line = wglp?.linesData.find((l: any) => l._name === selectedItem.name) as any;
                  if (line?._origColor) {
                    const { r, g, b } = line._origColor;
                    bg = `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                    color = luminance < 0.5 ? "white" : "black";
                  }
                }
                return (
                  <Box
                    position="absolute"
                    bottom={2}
                    left={2}
                    pointerEvents="none"
                    fontSize="xs"
                    fontFamily="mono"
                  >
                    <Box
                      px={2} py="1px" borderRadius="sm"
                      style={{ backgroundColor: bg, color }}
                    >
                      {selectedItem.type === "cursor" ? `Marker ${selectedItem.name}` : `"${selectedItem.name}"`} selected — Del to remove · Esc to deselect
                    </Box>
                  </Box>
                );
              })()}
              {(cursorA.visible || cursorB.visible || cursorM.visible) && (
                <Box
                  position="absolute"
                  bottom={2}
                  right={2}
                  pointerEvents="none"
                  fontSize="xs"
                  fontFamily="mono"
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  gap="4px"
                >
                  {cursorA.visible && (
                    <Box bg="orange.400" color="white" px={2} py="1px" borderRadius="sm">
                      {`A${cursorA.name ? ` [${cursorA.name}]` : ""}: (${unitConvert2string(cursorA.x, 3)}, ${unitConvert2string(cursorA.y, 3)})`}
                    </Box>
                  )}
                  {cursorB.visible && (
                    <Box bg="blue.400" color="white" px={2} py="1px" borderRadius="sm">
                      {`B${cursorB.name ? ` [${cursorB.name}]` : ""}: (${unitConvert2string(cursorB.x, 3)}, ${unitConvert2string(cursorB.y, 3)})`}
                    </Box>
                  )}
                  {cursorA.visible && cursorB.visible && (() => {
                    const dx = cursorB.x - cursorA.x;
                    const dy = cursorB.y - cursorA.y;
                    return (
                      <Box bg="purple.500" color="white" px={2} py="1px" borderRadius="sm">
                        {`dX: ${unitConvert2string(Math.abs(dx), 3)}, dY: ${unitConvert2string(Math.abs(dy), 3)}, dy/dx: ${unitConvert2string(dx !== 0 ? dy / dx : Infinity, 3)}`}
                      </Box>
                    );
                  })()}
                  {cursorM.visible && (
                    <Box bg="green.400" color="white" px={2} py="1px" borderRadius="sm">
                      {`M${cursorM.name ? ` [${cursorM.name}]` : ""}: (${unitConvert2string(cursorM.x, 3)}, ${unitConvert2string(cursorM.y, 3)})`}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </GridItem>
        </Grid>

        {/* Overlay legend */}
        {checkCallBack && showLegend && displayData && displayData.length > 0 && (
          <Box
            position="absolute"
            top="2em"
            right="8px"
            bg="bg.panel"
            border="1px solid"
            borderColor="border.muted"
            borderRadius="md"
            p={2}
            minWidth="220px"
            maxWidth="300px"
            maxHeight="60%"
            overflowY="auto"
            boxShadow="md"
            opacity={0.92}
            zIndex={10}
          >
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" mb={1}>
                <HStack gap={1}>
                  <Button size="xs" variant="ghost" onClick={selectAllCallback}>All</Button>
                  <Button size="xs" variant="ghost" onClick={selectNoneCallback}>None</Button>
                </HStack>
                <HStack gap={1}>
                  {colorizeCallback && (
                    <Box position="relative">
                      <Button
                        size="xs"
                        variant="ghost"
                        title="Edit curve colors"
                        onClick={() => setShowColorEditor(s => !s)}
                      >🎨</Button>
                      {showColorEditor && displayData && (
                        <Box
                          position="absolute"
                          top="110%"
                          right={0}
                          zIndex={200}
                          bg="bg.panel"
                          border="1px solid"
                          borderColor="border.muted"
                          borderRadius="md"
                          boxShadow="md"
                          p={3}
                          minWidth="220px"
                          maxHeight="260px"
                          overflowY="auto"
                          fontSize="xs"
                        >
                          <Flex justify="space-between" align="center" mb={2}>
                            <Box fontWeight="bold">Curve Colors</Box>
                            <Button size="xs" variant="ghost" onClick={() => setShowColorEditor(false)}>✕</Button>
                          </Flex>
                          {displayData.map((d) => {
                            const hex = "#" +
                              Math.round(d.color.r * 255).toString(16).padStart(2, "0") +
                              Math.round(d.color.g * 255).toString(16).padStart(2, "0") +
                              Math.round(d.color.b * 255).toString(16).padStart(2, "0");
                            return (
                              <Flex key={d.name} align="center" gap={2} mb={1}>
                                <input
                                  type="color"
                                  value={hex}
                                  style={{ width: "28px", height: "20px", padding: 0, border: "none", cursor: "pointer", background: "none" }}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const r = parseInt(v.slice(1, 3), 16) / 255;
                                    const g = parseInt(v.slice(3, 5), 16) / 255;
                                    const b = parseInt(v.slice(5, 7), 16) / 255;
                                    onColorChange?.(d.name, { r, g, b });
                                  }}
                                />
                                <Box
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  whiteSpace="nowrap"
                                  maxWidth="160px"
                                  title={d.name}
                                  color="fg"
                                >
                                  {d.name}
                                </Box>
                              </Flex>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => setShowLegend(false)} title="Close legend">✕</Button>
                </HStack>
              </Flex>
              {displayData.map((d) => (
                <Flex key={d.name} align="center" gap={2} minWidth={0}>
                  <Box
                    w="12px"
                    h="12px"
                    borderRadius="2px"
                    flexShrink={0}
                    style={{
                      backgroundColor: `rgb(${Math.round(d.color.r * 255)},${Math.round(d.color.g * 255)},${Math.round(d.color.b * 255)})`,
                    }}
                  />
                  <Checkbox
                    size="sm"
                    checked={d.visible}
                    onCheckedChange={(e) => checkCallBack(d.name, e.checked === true)}
                  >
                    <Box
                      fontSize="xs"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      maxWidth="140px"
                      title={d.name}
                    >
                      {d.name}
                    </Box>
                  </Checkbox>
                  {cursorA.visible && cursorA.name === d.name && (
                    <Box w="8px" h="8px" borderRadius="50%" flexShrink={0} bg="orange.400" title="Cursor A" />
                  )}
                  {cursorB.visible && cursorB.name === d.name && (
                    <Box w="8px" h="8px" borderRadius="50%" flexShrink={0} bg="blue.400" title="Cursor B" />
                  )}
                  {cursorM.visible && cursorM.name === d.name && (
                    <Box w="8px" h="8px" borderRadius="50%" flexShrink={0} bg="green.400" title="Cursor M" />
                  )}
                </Flex>
              ))}
            </Flex>
          </Box>
        )}
      </Box>
    </>
  );
}

export default React.memo(PlotArray);
//export default Plot;
