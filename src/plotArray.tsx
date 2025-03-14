import React, { JSX, useEffect, useRef, useState } from "react";
import { ColorRGBA, WebglLine, WebglPlot, WebglSquare } from "webgl-plot";
import type {
  ComplexDataType,
  RealDataType,
  ResultType,
} from "eecircuit-engine";
import {
  Box,
  CheckboxCheckedChangeDetails,
  Grid,
  GridItem,
  HStack,
  SliderValueChangeDetails,
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

let wglp: WebglPlot;
let lineMinMax = [{ minY: 0, maxY: 1 }] as LineMinMaxType[];

const zoomRect = new WebglSquare(new ColorRGBA(0.8, 0.8, 0.2, 0.25));
const crossXLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);
const crossYLine = new WebglLine(new ColorRGBA(0.1, 1, 0.1, 1), 2);

function PlotArray(
  { resultArray: resultArray, displayData }: PlotType,
): JSX.Element {
  const canvasMain = useRef<HTMLCanvasElement>(null);
  const [plotOptions, setPlotOptions] = useState<PlotOptions>({
    crosshair: true,
    sweepSlider: false,
  });
  const [isSweep, SetIsSweep] = useState(false);
  const [isAxis, SetIsAxis] = useState(false);

  const [sliderValue, SetSliderValue] = useState(0);

  const [crossXY, setCrossXY] = useState<CrossXY>({ x: 0, y: 0 });

  const [, setZoomStatus] = useState<ZoomStatus>({
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
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvasMain.current.width = canvasMain.current.clientWidth *
        devicePixelRatio;
      canvasMain.current.height = canvasMain.current.clientHeight *
        devicePixelRatio;

      wglp = new WebglPlot(canvasMain.current, {
        powerPerformance: "high-performance",
      });

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
        { passive: false },
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
    setZoomStatus({
      scale: wglp.gScaleX,
      offset: wglp.gOffsetX / wglp.gScaleX,
    });
  }, [mouseDrag]);

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
          1,
        );
      } else {
        color = new ColorRGBA(0.5, 0.5, 0.5, 1);
      }
      const line = new WebglLine(color, numPoints);
      let minY = 100000;
      let maxY = -100000;
      let minPos = maxY;
      let maxNeg = minY;

      for (let i = 0; i < numPoints; i++) {
        line.setX(i, data[0].values[i]);
        const y = data[col].values[i];
        line.setY(i, y);
        maxY = maxY > y ? maxY : y;
        minY = minY < y ? minY : y;
        minPos = minY < y && y > 0 ? minPos : y;
        maxNeg = maxY > y && y < 0 ? maxNeg : y;
      }

      wglp.addDataLine(line);

      //console.log("📈", line);
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
          1,
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
        dataYMag.push(Math.sqrt(Math.pow(value.real, 2) + Math.pow(value.img, 2)));
        dataYPhase.push((Math.atan2(value.img , value.real) * 180) / Math.PI);
      });
      drawLine(dataYMag, dataXReal, 2 * col - 1);
      drawLine(dataYPhase, dataXReal, 2 * col);
    }
  };

  useEffect(() => {
    wglp.removeAllLines();
    wglp.addSurface(zoomRect); //change this to Aux !!!!!!
    wglp.addAuxLine(crossXLine);
    wglp.addAuxLine(crossYLine);

    /* x axis is [0,1]*/
    wglp.gOffsetX = -1;
    wglp.gScaleX = 2;
    console.log("😱", resultArray);

    if (resultArray && resultArray.results.length > 0) {
      makeLine(resultArray.results);
      scaleUpdate(findMinMaxGlobal());
    }

    //console.log("line-->", wglp.linesData);
  }, [resultArray, displayData]);

  useEffect(() => {
    //console.log("plot->DD->", displayData);
    //console.log("plot->DD->", wglp.linesData);
    if (resultArray && displayData) {
      if (resultArray.sweep.length > 0) {
        displayData.forEach((e) => {
          for (let i = 0; i < resultArray.sweep.length; i++) {
            //wglp.linesData[(e.index - 1) * resultsArray.sweep.length + i].visible = e.visible;
            const offset = isComplex(resultArray) ? 2 : 1;
            const line =
              wglp.linesData[e.index - offset + i * displayData.length];
            if (line) {
              line.visible = e.visible;
            }
          }
        });
        scaleUpdate(findMinMaxGlobal());
        //}
      } else {
        if (wglp.linesData.length == displayData.length) {
          displayData.forEach((e) => {
            //first item is time (offset=1) or frequency (offset=2)
            const offset = isComplex(resultArray) ? 2 : 1;
            wglp.linesData[e.index - offset].visible = e.visible;
          });
          scaleUpdate(findMinMaxGlobal());
        }
      }
    }

    //console.log("CANVAS CANVAS!!!!!!!!!", wglp.lines);
  }, [displayData]);

  const findMinMaxGlobal = (): ScaleType => {
    //???????????????????????

    let minY = 1e6;
    let maxY = -1e6;
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

    const minmax = { minY: minY, maxY: maxY, minX: minX, maxX: maxX };
    return minmax;
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
      const width =
        (e.target as HTMLCanvasElement).getBoundingClientRect().width;
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
    const xOffset =
      (e.target as HTMLCanvasElement).getBoundingClientRect().left;
    const yOffSet = (e.target as HTMLCanvasElement).getBoundingClientRect().top;
    const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
    const height =
      (e.target as HTMLCanvasElement).getBoundingClientRect().height;
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
      const moveX = (e.clientX - xOffset) * devicePixelRatio -
        mouseDrag.dragInitialX;
      const offsetX = moveX / width;
      wglp.gOffsetX = offsetX + mouseDrag.dragOffsetOld;
    }
    /*****************cross hair************** */

    const canvas = canvasMain.current;

    if (canvas && plotOptions.crosshair) {
      const xPosRel = (2 * (e.clientX - xOffset - width / 2)) / width;
      const x = (1 / wglp.gScaleX) * (xPosRel - wglp.gOffsetX);
      //console.log("cross-->", xPosRel, "--> ", x);

      const yPosRel = 1 - 2 * (e.clientY - yOffSet) / height;
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
      const width =
        (e.target as HTMLCanvasElement).getBoundingClientRect().width;
      const cursorUpX = (2 * (e.clientX - eOffset - width / 2)) / width;
      const zoomFactor = Math.abs(cursorUpX - mouseZoom.cursorDownX) /
        (2 * wglp.gScaleX);
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
    //e.preventDefault();
    //const eOffset = (e.target as HTMLCanvasElement).getBoundingClientRect().x;
    //const width = (e.target as HTMLCanvasElement).getBoundingClientRect().width;
    //const cursorOffsetX = (2 * (e.clientX - eOffset - width / 2)) / width;
    if (e.shiftKey) {
      //offset += e.deltaY * 0.1;
      //wglp.gOffsetX = 0.1 * offset;
    } else {
      let scale = wglp.gScaleX;
      if (e.deltaY < 0) {
        scale = wglp.gScaleX + -1 * e.deltaY * (wglp.gScaleX * 0.001);
      } else {
        scale = wglp.gScaleX - e.deltaY * (wglp.gScaleX * 0.001);
      }

      wglp.gScaleX = 1 * scale;
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
    height: "60vh",
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
      <HStack>
        <Checkbox defaultChecked={false} onCheckedChange={axisBoxHandle}>
          Axis
        </Checkbox>
        <Checkbox defaultChecked onCheckedChange={crosshairBoxHandle}>
          Crosshair
        </Checkbox>
        {plotOptions.crosshair
          ? (
            <>
              <Tag w="7em" colorScheme="teal">
                {`X: ${unitConvert2string(crossXY.x, 3)}`}
              </Tag>
              <Tag w="7em" colorScheme="teal">
                {`Y: ${unitConvert2string(crossXY.y, 3)}`}
              </Tag>
            </>
          )
          : <></>}
        {isSweep
          ? (
            <Checkbox
              defaultChecked={false}
              onCheckedChange={sweepCheckBoxHandle}
            >
              Sweep slider
            </Checkbox>
          )
          : <></>}
        {plotOptions.sweepSlider && isSweep
          ? (
            <>
              <Tag colorScheme="teal">
                {`${unitConvert2string(sliderValue, 3)}`}
              </Tag>
            </>
          )
          : <></>}

        {
          /*<Checkbox defaultIsChecked={false}>Neg</Checkbox>
        <Checkbox defaultIsChecked={false}>Log10X</Checkbox>
        <Checkbox defaultIsChecked={false} onChange={handleLog10YCheckbox}>
          Log10Y
        </Checkbox>*/
        }
      </HStack>

      {plotOptions.sweepSlider && isSweep
        ? (
          <Slider
            defaultValue={[0]}
            min={0}
            max={resultArray ? resultArray.sweep.length - 1 : 0}
            onValueChange={handleSweepSlider}
          />
        )
        : <></>}

      <Grid
        templateRows={`1fr ${isAxis ? 1.5 : 0}em`}
        templateColumns={`${isAxis ? 5 : 0}em 1fr`}
        gap={0}
      >
        <GridItem
          rowStart={1}
          colStart={1}
          bg="gray.900"
          borderRight="solid 2px"
        >
          {isAxis
            ? (
              <Axis
                scale={wglp ? wglp.gScaleY : 1}
                offset={wglp ? wglp.gOffsetY : 0}
                axis="y"
                yHeight={canvasStyle.height as string}
              />
            )
            : <></>}
        </GridItem>
        <GridItem rowStart={1} colStart={2} bg="papayawhip">
          <Box bg="gray.900">
            <canvas
              ref={canvasMain}
              style={canvasStyle}
              onMouseDown={mouseDown}
              onMouseMove={mouseMove}
              onMouseUp={mouseUp}
              onDoubleClick={doubleClick}
              onWheel={wheelEvent}
              onContextMenu={contextMenu}
            >
            </canvas>
          </Box>
        </GridItem>
        <GridItem
          rowStart={2}
          colStart={1}
          bg="grey.900"
          borderTop="solid 2px"
          borderRight="solid 2px"
        />
        <GridItem
          rowStart={2}
          colStart={2}
          bg="gray.900"
          borderTop={`${isAxis ? "solid 2px" : ""}`}
        >
          {isAxis
            ? (
              <Axis
                scale={wglp ? wglp.gScaleX : 1}
                offset={wglp ? wglp.gOffsetX : 0}
                axis="x"
                yHeight={canvasStyle.height as string}
              />
            )
            : <></>}
        </GridItem>
      </Grid>
    </>
  );
}

export default React.memo(PlotArray);
//export default Plot;
