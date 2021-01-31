import React, { useState, useEffect, useRef } from "react";
import WebGlPlot, { ColorRGBA, WebglLine, WebglSquare } from "./webglplot/webglplot";
//import WebGlPlot, { ColorRGBA, WebglLine } from "webgl-plot";
import { calcContrast, calcLuminance } from "./calcContrast";
import type { DisplayDataType } from "./EEsim";
import type { RealDataType, ResultType } from "./sim/readOutput";
import { Box, Checkbox, Grid, GridItem, HStack, Tag } from "@chakra-ui/react";
import { Slider, SliderTrack, SliderFilledTrack, SliderThumb } from "@chakra-ui/react";
import type { ParserType } from "./parser";
import Axis from "./axis";
import unitConvert from "./sim/unitConverter";

type PlotType = {
  results?: ResultType;
  parser?: ParserType;
  displayData?: DisplayDataType[];
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
};

let wglp: WebGlPlot;
let lineMinMax = [{ minY: 0, maxY: 1 }] as LineMinMaxType[];
let sweepIndices = [] as number[]; //already has one

const zoomRect = new WebglSquare(new ColorRGBA(0.8, 0.8, 0.2, 0.25));
const crossXLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);
const crossYLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);

function Plot({ results, parser, displayData }: PlotType): JSX.Element {
  const canvasMain = useRef<HTMLCanvasElement>(null);
  const [plotOptions, setPlotOptions] = useState<PlotOptions>({
    crosshair: true,
    sweepSlider: false,
  });
  const [isSweep, SetIsSweep] = useState(false);
  const [isAxis, SetIsAxis] = useState(false);

  const [sliderValue, SetSliderValue] = useState(0);

  const [crossXY, setCrossXY] = useState<CrossXY>({ x: 0, y: 0 });

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
    console.log("canvas->", "I am here! 🧨");
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
    getLineMinMaxNormal(data);
    SetIsSweep(false);
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
    if (sweepIndices.length > 0) {
      SetIsSweep(true);
    }
    //console.log("sweep-->", sweepIndices);
    //console.log("sweep-->", dataSweep);

    //?????????????????????
    lineMinMax = [];
    getLineMinMaxSweep(dataSweep);
  };

  const getLineMinMaxNormal = (data: number[][]) => {
    for (let col = 1; col < data.length; col++) {
      //const color = getColor();
      let color: ColorRGBA;
      if (displayData) {
        color = new ColorRGBA(
          displayData[col - 1].color.r,
          displayData[col - 1].color.g,
          displayData[col - 1].color.b,
          1
        );
      } else {
        color = new ColorRGBA(0.5, 0.5, 0.5, 1);
      }
      const line = new WebglLine(color, data[0].length);
      //const maxX = data[0][data[0].length - 1];
      let minY = 100000;
      let maxY = -100000;
      let minPos = maxY;
      let maxNeg = minY;

      for (let i = 0; i < data[0].length; i++) {
        line.setX(i, data[0][i]);
        const y = data[col][i];
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
        minX: data[0][0],
        maxX: data[0][data[0].length - 1],
      });
    }
  };

  const getLineMinMaxSweep = (dataSweep: number[][][]) => {
    for (let col = 1; col < dataSweep.length; col++) {
      let minY = 100000;
      let maxY = -100000;
      let minPos = 10000;
      let maxNeg = -10000;
      for (let sweep = 0; sweep < dataSweep[0].length; sweep++) {
        //const color = getColor();
        let color: ColorRGBA;
        if (displayData) {
          color = new ColorRGBA(
            displayData[col - 1].color.r,
            displayData[col - 1].color.g,
            displayData[col - 1].color.b,
            1
          );
        } else {
          color = new ColorRGBA(0.5, 0.5, 0.5, 1);
        }
        const line = new WebglLine(color, dataSweep[0][0].length);
        //const maxX = dataSweep[0][sweep][dataSweep[0][sweep].length - 1];

        for (let i = 0; i < dataSweep[0][sweep].length; i++) {
          line.setX(i, dataSweep[0][sweep][i]);
          const y = dataSweep[col][sweep][i];
          line.setY(i, y);
          maxY = maxY > y ? maxY : y;
          minY = minY < y ? minY : y;
          if (y > 0) {
            minPos = minPos < y ? minPos : y;
          }
          if (y < 0) {
            maxNeg = maxNeg > y ? maxNeg : y;
          }
        }
        wglp.addDataLine(line);
        lineMinMax.push({
          minY: minY,
          maxY: maxY,
          minYPos: minPos,
          maxYNeg: maxNeg,
          minX: dataSweep[0][0][0],
          maxX: dataSweep[0][0][dataSweep[0][0].length - 1],
        });
      }
    }
  };

  useEffect(() => {
    sweepIndices = [];
    wglp.removeAllLines();
    wglp.addSurface(zoomRect); //change this to Aux !!!!!!
    wglp.addAuxLine(crossXLine);
    wglp.addAuxLine(crossYLine);

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

    //console.log("line-->", wglp.linesData);

    scaleUpdate(findMinMaxGlobal());
  }, [results]);

  useEffect(() => {
    //console.log("plot->DD->", displayData);
    //console.log("plot->DD->", wglp.lines);

    if (sweepIndices.length > 0) {
      if (displayData && wglp.linesData.length == sweepIndices.length * displayData.length) {
        //console.log("plot->DD->", "it is sweep");
        displayData.forEach((e) => {
          for (let i = 0; i < sweepIndices.length; i++) {
            wglp.linesData[(e.index - 1) * sweepIndices.length + i].visible = e.visible;
          }
        });
        scaleUpdate(findMinMaxGlobal());
      }
    } else {
      if (displayData && wglp.linesData.length == displayData.length) {
        displayData.forEach((e) => {
          //first item is time
          wglp.linesData[e.index - 1].visible = e.visible;
        });
        scaleUpdate(findMinMaxGlobal());
      }
    }

    //console.log("CANVAS CANVAS!!!!!!!!!", wglp.lines);
  }, [results, displayData]);

  const findMinMaxGlobal = (): ScaleType => {
    //???????????????????????
    let minY = 10000;
    let maxY = -10000;
    let minX = 0;
    let maxX = 1;

    for (let i = 0; i < wglp.linesData.length; i++) {
      if (wglp.linesData[i].visible) {
        const e = lineMinMax[i];
        maxY = maxY > e.maxY ? maxY : e.maxY;
        minY = minY < e.minY ? minY : e.minY;
      }
    }
    if (lineMinMax[0]) {
      minX = lineMinMax[0].minX;
      maxX = lineMinMax[0].maxX;
    }

    return { minY: minY, maxY: maxY, minX: minX, maxX: maxX };
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
    wglp.gScaleX = 2 / (scale.maxX - scale.minX);
    wglp.gOffsetX = -wglp.gScaleX * scale.minX - 1;
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
      zoomRect.visible = true;
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
      const moveX = (e.clientX - eOffset) * devicePixelRatio - mouseDrag.dragInitialX;
      const offsetX = moveX / width;
      wglp.gOffsetX = offsetX + mouseDrag.dragOffsetOld;
    }
    /*****************cross hair************** */

    const canvas = canvasMain.current;

    if (canvas && plotOptions.crosshair) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      //canvas.width = canvas.clientWidth * devicePixelRatio;
      //canvas.height = canvas.clientHeight * devicePixelRatio;
      //console.log("canvas->", canvas.width / devicePixelRatio, ",", canvas.offsetLeft);
      //???????????????????????????????????????????????????????????????????????????????????????

      //const x1 = 2 * ((e.pageX - canvas.offsetLeft) * devicePixelRatio - canvas.width / 2);
      const xPosRel =
        ((e.pageX - canvas.offsetLeft) * devicePixelRatio) / (width * devicePixelRatio);

      //const x = (1 / wglp.gScaleX) * (x1 / canvas.width) - wglp.gOffsetX;
      const x = (2 * xPosRel) / wglp.gScaleX - (wglp.gOffsetX + 1) / wglp.gScaleX;
      //console.log("cross-->", xPosRel, "--> ", x);
      const y =
        (1 / wglp.gScaleY) *
        ((2 * (canvas.height / 2 - (e.pageY - canvas.offsetTop) * devicePixelRatio)) /
          canvas.height -
          wglp.gOffsetY);
      cross(x, y);
    }
  };
  const cross = (x: number, y: number): void => {
    crossXLine.xy = new Float32Array([x, -1000, x, 1000]);
    crossYLine.xy = new Float32Array([-1000, y, 1000, y]);
    setCrossXY({ x: x, y: y });
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
    zoomRect.visible = false;
  };

  const doubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scaleUpdate(findMinMaxGlobal());
    setZoomStatus({ scale: wglp.gScaleX, offset: wglp.gOffsetX });
  };

  const contextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const crosshairBoxHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    let o = { ...plotOptions };
    o.crosshair = e.target.checked;
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

  const axisBoxHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    SetIsAxis(e.target.checked);
  };

  const sweepCheckBoxHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    let o = { ...plotOptions };
    o.sweepSlider = e.target.checked;
    setPlotOptions(o);
  };

  const handleSweepSlider = (value: number) => {
    if (displayData) {
      displayData.forEach((e) => {
        if (e.visible) {
          for (let i = 0; i < sweepIndices.length; i++) {
            wglp.linesData[(e.index - 1) * sweepIndices.length + i].color = new ColorRGBA(
              0,
              0.3,
              0.3,
              0.5
            );
          }
          wglp.linesData[(e.index - 1) * sweepIndices.length + value].color = new ColorRGBA(
            0.9,
            0.9,
            0,
            1
          );
        }
      });
    }
    if (parser) {
      const n = parser.sweepStart + parser.sweepStep * value;
      SetSliderValue(n);
    }
  };

  const canvasStyle = {
    width: "100%",
    height: "60vh",
  } as React.CSSProperties;

  const handleLog10YCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    wglp.gLog10Y = e.target.checked;

    if (e.target.checked) {
      const a = { ...findMinMaxGlobalLog10() };
      //console.log("log->", a);
      scaleUpdate({ minY: Math.log10(a.minY), maxY: Math.log10(a.maxY) } as ScaleType);
    } else {
      const a = { ...findMinMaxGlobal() };
      scaleUpdate({ minY: a.minY, maxY: a.maxY } as ScaleType);
    }
  };

  const findMinMaxGlobalLog10 = (): ScaleType => {
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
  };

  return (
    <>
      <HStack>
        <Checkbox defaultIsChecked={false} onChange={axisBoxHandle}>
          Axis
        </Checkbox>
        <Checkbox defaultIsChecked onChange={crosshairBoxHandle}>
          Crosshair
        </Checkbox>
        {plotOptions.crosshair ? (
          <>
            <Tag w="7em" colorScheme="teal">{`X: ${unitConvert(crossXY.x, 3)}`}</Tag>
            <Tag w="7em" colorScheme="teal">{`Y: ${unitConvert(crossXY.y, 3)}`}</Tag>
          </>
        ) : (
          <></>
        )}
        {isSweep ? (
          <Checkbox defaultIsChecked={false} onChange={sweepCheckBoxHandle}>
            Sweep slider
          </Checkbox>
        ) : (
          <></>
        )}
        {plotOptions.sweepSlider && isSweep ? (
          <>
            <Tag colorScheme="teal">{`${parser?.sweepVar}= ${unitConvert(sliderValue, 3)}`}</Tag>
          </>
        ) : (
          <></>
        )}

        {/*<Checkbox defaultIsChecked={false}>Neg</Checkbox>
        <Checkbox defaultIsChecked={false}>Log10X</Checkbox>
        <Checkbox defaultIsChecked={false} onChange={handleLog10YCheckbox}>
          Log10Y
        </Checkbox>*/}
      </HStack>
      {plotOptions.sweepSlider && isSweep ? (
        <Slider
          aria-label="slider-ex-1"
          defaultValue={0}
          min={0}
          max={sweepIndices.length}
          onChange={handleSweepSlider}>
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      ) : (
        <></>
      )}

      <Grid
        templateRows={`1fr ${isAxis ? 1.5 : 0}em`}
        templateColumns={`${isAxis ? 5 : 0}em 1fr`}
        gap={0}>
        <GridItem row={1} col={1} bg="gray.900" borderRight="solid 2px">
          {isAxis ? (
            <Axis
              scale={wglp ? wglp.gScaleY : 1}
              offset={wglp ? wglp.gOffsetY : 0}
              axis="y"
              yHeight={canvasStyle.height as string}
            />
          ) : (
            <></>
          )}
        </GridItem>
        <GridItem row={1} col={2} bg="papayawhip">
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
        </GridItem>
        <GridItem row={2} col={1} bg="gray.900" borderTop="solid 2px" borderRight="solid 2px" />
        <GridItem row={2} col={2} bg="gray.900" borderTop={`${isAxis ? "solid 2px" : ""}`}>
          {isAxis ? (
            <Axis
              scale={wglp ? wglp.gScaleX : 1}
              offset={wglp ? wglp.gOffsetX : 0}
              axis="x"
              yHeight={canvasStyle.height as string}
            />
          ) : (
            <></>
          )}
        </GridItem>
      </Grid>
    </>
  );
}

export default React.memo(Plot);
//export default Plot;
