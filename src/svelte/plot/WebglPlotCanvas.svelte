<script lang="ts">
  import { onMount } from "svelte";
  import type { ResultType } from "eecircuit-engine";
  import { clearCanvas, setupCanvasAndWebGL, UnifiedLinePlot, type LineConfig } from "webgl-plot";
  import type { AggregatedResult } from "../../components/ScientificPlot/types";
  import { renderXAxis, renderYAxis } from "../../components/ScientificPlot/plotcanvas/axis/axisRenderer";
  import { generatePlotColor } from "../../components/ScientificPlot/plotcanvas/styling/colorUtils";

  let {
    result,
    selectedVariables,
    isDarkMode,
    isLogX,
    isLogY,
    lineThickness,
    emphasizedPlotIndex = 0,
  }: {
    result: ResultType;
    selectedVariables: string[];
    isDarkMode: boolean;
    isLogX: boolean;
    isLogY: boolean;
    lineThickness: number;
    emphasizedPlotIndex?: number;
  } = $props();

  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let xAxis: HTMLCanvasElement;
  let yAxis: HTMLCanvasElement;
  let plot: UnifiedLinePlot | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let resizeVersion = $state(0);
  let crosshairVisible = $state(false);
  let crosshairX = $state(0);
  let crosshairY = $state(0);
  let crosshairLabel = $state("");
  const colorCache = new Map<string, [number, number, number, number]>();
  let scales = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  let baseScales = scales;
  let dragging = false;
  let dragStartX = 0;
  let dragOffsetX = 0;

  function buildLines(): LineConfig[] {
    const aggregated = result as AggregatedResult;
    const lines: Array<LineConfig & { variableName: string; parameterIndex?: number }> = [];
    if (aggregated.bracketPlotData?.length) {
      for (let variableIndex = 1; variableIndex < result.variableNames.length; variableIndex += 1) {
        const name = result.variableNames[variableIndex];
        if (!name || !selectedVariables.includes(name)) continue;
        for (const sweep of aggregated.bracketPlotData) {
          const xValues = sweep.data[0]?.values ?? [];
          const yValues = sweep.data[variableIndex]?.values ?? [];
          const points = new Float32Array(Math.min(xValues.length, yValues.length) * 2);
          for (let index = 0; index < points.length / 2; index += 1) {
            points[index * 2] = xValues[index] ?? 0;
            points[index * 2 + 1] = yValues[index] ?? 0;
          }
          const base = generatePlotColor(name, isDarkMode, colorCache);
          const emphasized = sweep.parameterIndex === emphasizedPlotIndex;
          lines.push({ points, color: [base[0], base[1], base[2], emphasized ? 1 : .18], thickness: emphasized ? lineThickness * 1.6 : lineThickness, enabled: true, variableName: name, parameterIndex: sweep.parameterIndex });
        }
      }
      return lines;
    }

    const xValues = result.data[0]?.values ?? [];
    for (let variableIndex = 1; variableIndex < result.variableNames.length; variableIndex += 1) {
      const name = result.variableNames[variableIndex];
      const yValues = result.data[variableIndex]?.values ?? [];
      if (!name || !selectedVariables.includes(name)) continue;
      const points = new Float32Array(Math.min(xValues.length, yValues.length) * 2);
      for (let index = 0; index < points.length / 2; index += 1) {
        points[index * 2] = Number(xValues[index] ?? 0);
        points[index * 2 + 1] = Number(yValues[index] ?? 0);
      }
      lines.push({ points, color: generatePlotColor(name, isDarkMode, colorCache), thickness: lineThickness, enabled: true, variableName: name });
    }
    return lines;
  }

  function renderAxes() {
    renderXAxis({ canvas: xAxis, scale: scales.scaleX, offset: scales.offsetX, isDarkMode, isLogX, isLogY });
    renderYAxis({ canvas: yAxis, scale: scales.scaleY, offset: scales.offsetY, isDarkMode, isLogX, isLogY });
  }

  function applyScales(next: typeof scales) {
    if (!plot || !gl) return;
    scales = next;
    plot.setGlobalTransform([scales.scaleX, scales.scaleY], [scales.offsetX, scales.offsetY]);
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
  }

  function rebuild() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    plot?.cleanup();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    gl = setupCanvasAndWebGL(canvas, { backgroundColor: [0, 0, 0, 0], antialias: true, powerPerformance: "high-performance", transparent: true, preserveDrawing: true });
    const lines = buildLines();
    plot = new UnifiedLinePlot(gl, Math.max(1, lines.length));
    plot.initLines(lines.length ? lines : [{ points: new Float32Array([0, 0, 0, 0]), color: [0, 0, 0, 0], enabled: false }]);
    plot.setLogAxis(isLogX, isLogY);
    const bounds = plot.autoScale();
    if (bounds) {
      const xRange = bounds.maxX - bounds.minX;
      const yRange = bounds.maxY - bounds.minY;
      scales = {
        scaleX: xRange > 0 && Number.isFinite(xRange) ? 2 / xRange : 1,
        scaleY: yRange > 0 && Number.isFinite(yRange) ? 2 / yRange : 1,
        offsetX: xRange > 0 ? -1 - bounds.minX * (2 / xRange) : 0,
        offsetY: yRange > 0 ? -1 - bounds.minY * (2 / yRange) : 0,
      };
      baseScales = { ...scales };
    }
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
  }

  function pointerPosition(event: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: 1 - ((event.clientY - rect.top) / rect.height) * 2 };
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const point = pointerPosition(event);
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const dataX = (point.x - scales.offsetX) / scales.scaleX;
    const nextScaleX = Math.max(baseScales.scaleX, scales.scaleX * factor);
    const nextOffsetX = point.x - dataX * nextScaleX;
    applyScales({ ...scales, scaleX: nextScaleX, offsetX: nextOffsetX });
  }

  function handlePointerMove(event: PointerEvent) {
    const point = pointerPosition(event);
    crosshairVisible = true;
    crosshairX = ((point.x + 1) / 2) * 100;
    crosshairY = ((1 - point.y) / 2) * 100;
    const x = (point.x - scales.offsetX) / scales.scaleX;
    const y = (point.y - scales.offsetY) / scales.scaleY;
    crosshairLabel = `X: ${x.toPrecision(5)}, Y: ${y.toPrecision(5)}`;
    if (dragging) {
      const delta = point.x - dragStartX;
      applyScales({ ...scales, offsetX: dragOffsetX + delta });
    }
  }

  onMount(() => {
    const observer = new ResizeObserver(() => { resizeVersion += 1; });
    observer.observe(host);
    return () => { observer.disconnect(); plot?.cleanup(); };
  });

  $effect(() => {
    JSON.stringify(result.variableNames);
    JSON.stringify(selectedVariables);
    isDarkMode; isLogX; isLogY; lineThickness; emphasizedPlotIndex; resizeVersion;
    const frame = requestAnimationFrame(rebuild);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="plot-grid" bind:this={host}>
  <canvas class="plot-y-axis" bind:this={yAxis}></canvas>
  <div class="plot-surface">
    <canvas
      class="plot-webgl"
      bind:this={canvas}
      onwheel={handleWheel}
      onpointerdown={(event) => { dragging = true; canvas.setPointerCapture(event.pointerId); const point = pointerPosition(event); dragStartX = point.x; dragOffsetX = scales.offsetX; }}
      onpointermove={handlePointerMove}
      onpointerup={(event) => { dragging = false; canvas.releasePointerCapture(event.pointerId); }}
      onpointerleave={() => { if (!dragging) crosshairVisible = false; }}
      ondblclick={() => applyScales({ ...baseScales })}
    ></canvas>
    {#if crosshairVisible}
      <span class="crosshair-v" style:left={`${crosshairX}%`}></span><span class="crosshair-h" style:top={`${crosshairY}%`}></span><output class="crosshair-label">{crosshairLabel}</output>
    {/if}
  </div>
  <canvas class="plot-x-axis" bind:this={xAxis}></canvas>
</div>
