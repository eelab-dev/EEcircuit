import React, { useState, useEffect, useRef } from "react";
import WebGlPlot, { ColorRGBA, WebglLine } from "./webglplot/webglplot";
import { calcContrast, calcLuminance } from "./calcContrast";
import type { DisplayDataType } from "./EEsim";
import type { RealDataType, ResultType } from "./sim/readOutput";
import { Box } from "@chakra-ui/react";

type PlotType = {
  results?: ResultType;
  displayData?: DisplayDataType[];
};

type TypeLineMinMax = {
  min: number;
  max: number;
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

let wglp: WebGlPlot;
let lineMinMax = [{ min: 0, max: 1 }] as TypeLineMinMax[];
let sweepIndices = [] as number[]; //already has one

const RectZ = new WebglLine(new ColorRGBA(1, 1, 1, 1), 4);

function Plot({ results, displayData }: PlotType): JSX.Element {
  const canvasMain = useRef<HTMLCanvasElement>(null);

  const [zoomStatus, setZoomStatus] = useState<ZoomStatus>({ scale: 1, offset: 0 });

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

  const getColor = (): ColorRGBA => {
    let contrast = 0;
    let r = 0,
      g = 0,
      b = 0;
    while (contrast < 4) {
      r = Math.random();
      g = Math.random();
      b = Math.random();

      //change the color versus background be careful of infinite loops

      contrast = calcContrast(calcLuminance(b, g, r), calcLuminance(0.23, 0.25, 0.35));
    }
    return new ColorRGBA(r, g, b, 1);
  };

  useEffect(() => {
    if (canvasMain.current) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvasMain.current.width = canvasMain.current.clientWidth * devicePixelRatio;
      canvasMain.current.height = canvasMain.current.clientHeight * devicePixelRatio;

      wglp = new WebGlPlot(canvasMain.current, { powerPerformance: "high-performance" });

      const newFrame = () => {
        wglp.update();

        requestAnimationFrame(newFrame);
      };
      requestAnimationFrame(newFrame);

      //bug fix see https://github.com/facebook/react/issues/14856#issuecomment-586781399
      canvasMain.current.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
        },
        { passive: false }
      );
    }
    ////bug fix see https://github.com/facebook/react/issues/14856#issuecomment-586781399
    return () => {
      canvasMain.current?.removeEventListener("wheel", (e) => {
        e.preventDefault();
      });
    };
  }, [canvasMain]);

  useEffect(() => {
    setZoomStatus({ scale: wglp.gScaleX, offset: wglp.gOffsetX / wglp.gScaleX });
  }, [mouseDrag]);

  /////////////////////////////////////////////////////////////////////

  const normalLine = (data: number[][]) => {
    lineMinMax = [];

    for (let col = 1; col < data.length; col++) {
      const color = getColor();
      const line = new WebglLine(color, data[0].length);
      const maxX = data[0][data[0].length - 1];
      let minY = 100000;
      let maxY = -100000;

      for (let i = 0; i < data[0].length; i++) {
        line.setX(i, data[0][i] / maxX);
        const y = data[col][i];
        line.setY(i, y);
        maxY = maxY > y ? maxY : y;
        minY = minY < y ? minY : y;
      }

      wglp.addLine(line);
      lineMinMax.push({ min: minY, max: maxY });
    }
  };

  const sweepLine = (data: number[][]) => {
    //isSweep = true;
    let dataSweep = [[[]]] as number[][][];

    for (let i = 0; i < data[0].length; i++) {
      if (i > 1 && data[0][i] < data[0][i - 1]) {
        sweepIndices.push(i);
      }
    }
    //add last set
    sweepIndices.push(data[0].length - 1);

    if (sweepIndices == []) {
      sweepIndices = [data[0].length];
    }

    dataSweep = [...Array(data.length)].map(() =>
      [...Array(sweepIndices.length)].map(() => Array(sweepIndices[0]).fill(0))
    );

    for (let col = 0; col < dataSweep.length; col++) {
      for (let sweep = 0; sweep < dataSweep[0].length; sweep++) {
        for (let i = 0; i < dataSweep[0][0].length; i++) {
          dataSweep[col][sweep][i] = data[col][sweep * sweepIndices[0] + i];
        }
      }
    }
    //console.log("sweep-->", sweepIndices);
    //console.log("sweep-->", dataSweep);

    //?????????????????????

    lineMinMax = [];

    for (let col = 1; col < dataSweep.length; col++) {
      let minY = 100000;
      let maxY = -100000;
      for (let sweep = 0; sweep < dataSweep[0].length; sweep++) {
        const color = getColor();
        const line = new WebglLine(color, dataSweep[0][0].length);
        const maxX = dataSweep[0][sweep][dataSweep[0][sweep].length - 1];

        for (let i = 0; i < dataSweep[0][sweep].length; i++) {
          line.setX(i, dataSweep[0][sweep][i] / maxX);
          const y = dataSweep[col][sweep][i];
          line.setY(i, y);
          maxY = maxY > y ? maxY : y;
          minY = minY < y ? minY : y;
        }
        wglp.addLine(line);
        lineMinMax.push({ min: minY, max: maxY });
      }
    }

    /*sweepIndices.forEach((e) => {
      console.log("sweep->", data[0][e]);
    });*/

    /*for (let i = 0; i < data[0].length; i++) {
      dataSweep[0][sweepIndex][i] = data[0][i + sweepOffset];
      if (i > 1 && data[0][i] < data[0][i - 1]) {
        sweepIndex++;
        sweepOffset = i;
      }
    }*/
  };

  useEffect(() => {
    sweepIndices = [];
    wglp.removeAllLines();
    RectZ.loop = true;
    wglp.addLine(RectZ);

    /* x axis is [0,1]*/
    wglp.gOffsetX = -1;
    wglp.gScaleX = 2;

    const data = results ? results.data : [[]];

    const possibleSweep = results ? results.header.indexOf("sweep") > 0 : false;
    if (possibleSweep) {
      sweepLine(data as RealDataType);
      //normalLine(data);
    } else {
      normalLine(data as RealDataType);
    }

    //?????????????????????

    // add test rectangle
    /*const Rect = new WebglLine(new ColorRGBA(0.9, 0.9, 0.9, 1), 4);
    Rect.loop = true;
    Rect.xy = new Float32Array([0, minY, 0, maxY, 0.5, maxY, 0.5, minY]);
    Rect.visible = true;
    wglp.addLine(Rect);*/
    console.log("line-->", lineMinMax);

    scaleUpdate(findMinMax());
  }, [results]);

  useEffect(() => {
    //console.log("plot->DD->", displayData);
    //console.log("plot->DD->", wglp.lines);

    //????????????????????????????????????????????? +1

    if (sweepIndices.length > 0) {
      if (displayData && wglp.lines.length == sweepIndices.length * displayData.length + 1) {
        console.log("plot->DD->", "it is sweep");
        displayData.forEach((e) => {
          for (let i = 0; i < sweepIndices.length; i++) {
            wglp.lines[(e.index - 1) * sweepIndices.length + i + 1].visible = e.visible;
          }
        });
        scaleUpdate(findMinMax());
      }
    } else {
      if (displayData && wglp.lines.length == displayData.length + 1) {
        displayData.forEach((e) => {
          wglp.lines[e.index].visible = e.visible;
        });
        scaleUpdate(findMinMax());
      }
    }

    //console.log("CANVAS CANVAS!!!!!!!!!", wglp.lines);
  }, [results, displayData]);

  type ScaleType = {
    minY: number;
    maxY: number;
  };

  const findMinMax = (): ScaleType => {
    //???????????????????????
    let minY = 10000;
    let maxY = -10000;
    // first line[0] is RectZ
    for (let i = 1; i < wglp.lines.length; i++) {
      if (wglp.lines[i].visible) {
        const e = lineMinMax[i - 1];
        maxY = maxY > e.max ? maxY : e.max;
        minY = minY < e.min ? minY : e.min;
      }
    }
    return { minY: minY, maxY: maxY };
  };

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
    //console.log("diff", diffY, "avg", avgY);
    //console.log(scale, wglp.gScaleY, wglp.gOffsetY);
    //wglp.update();
  };

  const mouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    //console.log(e.clientX - eOffset); //offset from the edge of the element

    if (e.button == 0) {
      (e.target as HTMLCanvasElement).style.cursor = "pointer";
      const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
      const cursorDownX = (2 * (e.clientX - eOffset - width / 2)) / width;
      setMouseZoom({ started: true, cursorDownX: cursorDownX, cursorOffsetX: 0 });
      RectZ.visible = true;
    }
    if (e.button == 2) {
      (e.target as HTMLCanvasElement).style.cursor = "grabbing";
      const dragInitialX = (e.clientX - eOffset) * devicePixelRatio;
      const dragOffsetOld = wglp.gOffsetX;
      setMouseDrag({ started: true, dragInitialX: dragInitialX, dragOffsetOld: dragOffsetOld });
    }
  };

  const mouseMove = (e: React.MouseEvent) => {
    const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
    if (mouseZoom.started) {
      const cursorOffsetX = (2 * (e.clientX - eOffset - width / 2)) / width;
      setMouseZoom({
        started: true,
        cursorDownX: mouseZoom.cursorDownX,
        cursorOffsetX: cursorOffsetX,
      });
      RectZ.xy = new Float32Array([
        (mouseZoom.cursorDownX - wglp.gOffsetX) / wglp.gScaleX,
        -100,
        (mouseZoom.cursorDownX - wglp.gOffsetX) / wglp.gScaleX,
        100,
        (cursorOffsetX - wglp.gOffsetX) / wglp.gScaleX,
        100,
        (cursorOffsetX - wglp.gOffsetX) / wglp.gScaleX,
        -100,
      ]);
      RectZ.visible = true;
    }
    /************Mouse Drag Evenet********* */
    if (mouseDrag.started) {
      const moveX = (e.clientX - eOffset) * devicePixelRatio - mouseDrag.dragInitialX;
      const offsetX = (wglp.gScaleY * moveX) / width;
      wglp.gOffsetX = offsetX + mouseDrag.dragOffsetOld;
    }
  };

  const mouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    if (mouseZoom.started) {
      const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
      const cursorUpX = (2 * (e.clientX - eOffset - width / 2)) / width;
      const zoomFactor = Math.abs(cursorUpX - mouseZoom.cursorDownX) / (2 * wglp.gScaleX);
      const offsetFactor =
        (mouseZoom.cursorDownX + cursorUpX - 2 * wglp.gOffsetX) / (2 * wglp.gScaleX);

      if (zoomFactor > 0) {
        wglp.gScaleX = 1 / zoomFactor;
        wglp.gOffsetX = -offsetFactor / zoomFactor;
      }

      setMouseZoom({ started: false, cursorDownX: 0, cursorOffsetX: 0 });
    }
    /************Mouse Drag Evenet********* */
    setMouseDrag({ started: false, dragInitialX: 0, dragOffsetOld: 0 });
    (e.target as HTMLCanvasElement).style.cursor = "grab";
    RectZ.visible = false;
  };

  const doubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    wglp.gScaleX = 2;
    wglp.gOffsetX = -1;
    setZoomStatus({ scale: wglp.gScaleX, offset: wglp.gOffsetX });
  };

  const contextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const canvasStyle = {
    width: "100%",
    height: "60vh",
  };

  return (
    <Box bg="gray.900">
      <canvas
        ref={canvasMain}
        style={canvasStyle}
        onMouseDown={mouseDown}
        onMouseMove={mouseMove}
        onMouseUp={mouseUp}
        onDoubleClick={doubleClick}
        onContextMenu={contextMenu}></canvas>
    </Box>
  );
}

export default React.memo(Plot);
//export default Plot;
