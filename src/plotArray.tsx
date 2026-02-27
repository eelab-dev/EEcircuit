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

type PlotType = {
  resultArray?: ResultArrayType;
  displayData?: DisplayDataType[];
  theme: "light" | "dark";
  checkCallBack?: (name: string, checked: boolean) => void;
  selectAllCallback?: () => void;
  selectNoneCallback?: () => void;
  colorizeCallback?: () => void;
  height?: string;
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
  dragOffsetOld: number;
};

type MouseZoom = {
  started: boolean;
  cursorDownX: number;
  cursorOffsetX: number;
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

const dotA = new WebglSquare(new ColorRGBA(1, 0.5, 0, 1));
const dotB = new WebglSquare(new ColorRGBA(0, 0.8, 1, 1));

function PlotArray({
  resultArray: resultArray,
  displayData,
  theme,
  checkCallBack,
  selectAllCallback,
  selectNoneCallback,
  colorizeCallback,
  height: heightProp,
}: PlotType): JSX.Element {
  const canvasMain = useRef<HTMLCanvasElement>(null);
  const canvasGrid = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  // Use refs for values needed in the render loop to avoid closure stales
  const cursorARef = useRef<CrossXY & { visible: boolean }>({ x: 0, y: 0, visible: false });
  const cursorBRef = useRef<CrossXY & { visible: boolean }>({ x: 0, y: 0, visible: false });

  const [plotOptions, setPlotOptions] = useState<PlotOptions>({
    crosshair: true,
    sweepSlider: false,
    showPoints: true,
  });
  const [isSweep, SetIsSweep] = useState(false);
  const [isAxis, SetIsAxis] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const [sliderValue, SetSliderValue] = useState(0);

  const [crossXY, setCrossXY] = useState<CrossXY>({ x: 0, y: 0 });

  // Cursor positions in physical coordinates for UI display
  const [cursorA, setCursorA] = useState<CrossXY & { visible: boolean }>({ x: 0, y: 0, visible: false });
  const [cursorB, setCursorB] = useState<CrossXY & { visible: boolean }>({ x: 0, y: 0, visible: false });

  // Update refs when state changes
  useEffect(() => { cursorARef.current = cursorA; }, [cursorA]);
  useEffect(() => { cursorBRef.current = cursorB; }, [cursorB]);

  const [zoomStatus, setZoomStatus] = useState<ZoomStatus>({
    scale: 1,
    offset: 0,
  });

  const [mouseZoom, setMouseZoom] = useState<MouseZoom>({
    started: false,
    cursorDownX: 0,
    cursorOffsetX: 0,
  });
  const [mouseDrag, setMouseDrag] = useState<MouseDrag>({
    started: false,
    dragInitialX: 0,
    dragOffsetOld: 0,
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
      // Tag line with metadata for easier visibility control
      (line as any).sourceIndex = col - 1;
      (line as any).isPoints = false;

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
          // Metadata sourceIndex corresponds to the variable index in displayData
          // We need to map it back to the 'e.index' which is (sourceIndex + offset)
          const isVisible = visibilityMap.get(line.sourceIndex + offset);
          line.visible = isVisible !== undefined ? isVisible : true;
        }
      });
      
      scaleUpdate(findMinMaxGlobal());
    }

    // Re-add auxiliary elements
    wglp.addSurface(zoomRect);
    wglp.addAuxLine(crossXLine);
    wglp.addAuxLine(crossYLine);
    wglp.addAuxLine(cursorXLineA);
    wglp.addAuxLine(cursorYLineA);
    wglp.addAuxLine(cursorXLineB);
    wglp.addAuxLine(cursorYLineB);
    wglp.addSurface(dotA);
    wglp.addSurface(dotB);

    cursorXLineA.visible = cursorA.visible;
    cursorYLineA.visible = cursorA.visible;
    cursorXLineB.visible = cursorB.visible;
    cursorYLineB.visible = cursorB.visible;

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
      if (key === "a" || key === "b") {
        if (!wglp || wglp.linesData.length === 0) return;

        // Find closest point among visible lines
        let bestPoint = { x: 0, y: 0 };
        let minDistanceSq = Infinity;
        let found = false;

        wglp.linesData.forEach((baseLine) => {
          if (!baseLine.visible) return;
          const line = baseLine as WebglLine;

          // Find closest point in this line (binary search would be faster, but linear is fine for now)
          // We look for closest X first, then check Y distance
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
              found = true;
            }
          }
        });

        if (found) {
          if (key === "a") {
            setCursorA({ ...bestPoint, visible: true });
          } else {
            setCursorB({ ...bestPoint, visible: true });
          }
        }
      }
      
      // 'c' to clear cursors
      if (key === "c") {
        setCursorA(prev => ({ ...prev, visible: false }));
        setCursorB(prev => ({ ...prev, visible: false }));
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
    const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    //console.log(e.clientX - eOffset); //offset from the edge of the element

    if (e.button == 0) {
      (e.target as HTMLCanvasElement).style.cursor = "pointer";
      const width = (e.target as HTMLCanvasElement).getBoundingClientRect()
        .width;
      const cursorDownX = (2 * (e.clientX - eOffset - width / 2)) / width;
      setMouseZoom({
        started: true,
        cursorDownX: cursorDownX,
        cursorOffsetX: 0,
      });
      zoomRect.visible = true;
    }
    if (e.button == 2) {
      (e.target as HTMLCanvasElement).style.cursor = "grabbing";
      const dragInitialX = (e.clientX - eOffset) * devicePixelRatio;
      const dragOffsetOld = wglp.gOffsetX;
      setMouseDrag({
        started: true,
        dragInitialX: dragInitialX,
        dragOffsetOld: dragOffsetOld,
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
        cursorOffsetX: cursorOffsetX,
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
    /************Mouse Drag Evenet********* */
    if (mouseDrag.started) {
      const moveX =
        (e.clientX - xOffset) * devicePixelRatio - mouseDrag.dragInitialX;
      const offsetX = moveX / width;
      wglp.gOffsetX = offsetX + mouseDrag.dragOffsetOld;
    }
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
    const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    if (mouseZoom.started) {
      const width = (e.target as HTMLCanvasElement).getBoundingClientRect()
        .width;
      const cursorUpX = (2 * (e.clientX - eOffset - width / 2)) / width;
      const zoomFactor =
        Math.abs(cursorUpX - mouseZoom.cursorDownX) / (2 * wglp.gScaleX);
      const offsetFactor =
        (mouseZoom.cursorDownX + cursorUpX - 2 * wglp.gOffsetX) /
        (2 * wglp.gScaleX);

      if (zoomFactor > 0) {
        wglp.gScaleX = 1 / zoomFactor;
        wglp.gOffsetX = -offsetFactor / zoomFactor;
      }

      setMouseZoom({ started: false, cursorDownX: 0, cursorOffsetX: 0 });
    }
    /************Mouse Drag Evenet********* */
    setMouseDrag({ started: false, dragInitialX: 0, dragOffsetOld: 0 });
    (e.target as HTMLCanvasElement).style.cursor = "grab";
    zoomRect.visible = false;
  };

  const doubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    scaleUpdate(findMinMaxGlobal());
    setZoomStatus({ scale: wglp.gScaleX, offset: wglp.gOffsetX });
  };

  function wheelEvent(e: React.WheelEvent<HTMLCanvasElement>) {
    // On macOS, Shift+scroll swaps deltaY to deltaX, so use whichever is non-zero
    const delta = e.shiftKey ? (e.deltaX || e.deltaY) : e.deltaY;
    if (e.shiftKey) {
      // Shift+scroll: Y-axis zoom
      let scale = wglp.gScaleY;
      if (delta < 0) {
        scale = wglp.gScaleY + -1 * delta * (wglp.gScaleY * 0.001);
      } else {
        scale = wglp.gScaleY - delta * (wglp.gScaleY * 0.001);
      }
      wglp.gScaleY = scale;
    } else {
      // Normal scroll: X-axis zoom
      let scale = wglp.gScaleX;
      if (delta < 0) {
        scale = wglp.gScaleX + -1 * delta * (wglp.gScaleX * 0.001);
      } else {
        scale = wglp.gScaleX - delta * (wglp.gScaleX * 0.001);
      }
      wglp.gScaleX = scale;
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
          {checkCallBack && (
            <Checkbox
              checked={showLegend}
              onCheckedChange={(e) => setShowLegend(e.checked === true)}
            >
              Legend
            </Checkbox>
          )}

          <Button size="xs" colorScheme="blue" variant="outline" onClick={() => scaleUpdate(findMinMaxGlobal())}>
            Reset View
          </Button>
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

          {cursorA.visible && (
            <Tag colorScheme="orange">
              {`A: (${unitConvert2string(cursorA.x, 3)}, ${unitConvert2string(cursorA.y, 3)})`}
            </Tag>
          )}

          {cursorB.visible && (
            <Tag colorScheme="blue">
              {`B: (${unitConvert2string(cursorB.x, 3)}, ${unitConvert2string(cursorB.y, 3)})`}
            </Tag>
          )}

          {cursorA.visible && cursorB.visible && (
            <Tag colorScheme="purple">
              {`dX: ${unitConvert2string(Math.abs(cursorB.x - cursorA.x), 3)}, dY: ${unitConvert2string(Math.abs(cursorB.y - cursorA.y), 3)}`}
            </Tag>
          )}

          <Box fontSize="xs" color="fg.muted" borderLeft="solid 1px" pl={4} ml={2}>
            Shortcuts: <b>'a'</b>/<b>'b'</b> to mark, <b>'c'</b> to clear. Scroll: X-zoom, Shift+Scroll: Y-zoom.
          </Box>
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
            minWidth="140px"
            maxWidth="200px"
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
                    <Button size="xs" variant="ghost" onClick={colorizeCallback}>🌈</Button>
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
