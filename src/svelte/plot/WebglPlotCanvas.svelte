<script lang="ts">
  import { onMount } from "svelte";
  import { Crosshair, MapPin } from "@lucide/svelte";
  import { SvelteMap } from "svelte/reactivity";
  import type { ResultType } from "eecircuit-engine";
  import { clearCanvas, setupCanvasAndWebGL, UnifiedLinePlot, type LineConfig } from "webgl-plot";
  import type { AggregatedResult } from "../../components/ScientificPlot/types";
  import { renderXAxis, renderYAxis } from "../../components/ScientificPlot/plotcanvas/axis/axisRenderer";
  import { generatePlotColor } from "../../components/ScientificPlot/plotcanvas/styling/colorUtils";
  import { formatEngineering } from "../../components/ScientificPlot/utils/formatUtils";
  import { interpolateLineAtX } from "../../utils/cursorSnap";

  type PlotLine = LineConfig & { variableName: string; parameterIndex?: number };

  let {
    result,
    selectedVariables,
    isDarkMode,
    isLogX,
    isLogY,
    inputProfile,
    lineThickness,
    canvasId,
    emphasizedPlotIndex = 0,
    externalXTransform,
    onXTransform,
    cursorEnabled,
    externalCursorX,
    onCursorX,
    snapToLines,
    onSnapToLinesChange,
    hoveredVariable,
  }: {
    result: ResultType;
    selectedVariables: string[];
    isDarkMode: boolean;
    isLogX: boolean;
    isLogY: boolean;
    inputProfile: "mouse" | "trackpad" | "touchscreen";
    lineThickness: number;
    canvasId: number;
    emphasizedPlotIndex?: number;
    externalXTransform?: { scaleX: number; offsetX: number; revision: number };
    onXTransform?: (transform: { scaleX: number; offsetX: number }) => void;
    cursorEnabled: boolean;
    externalCursorX: number | null;
    onCursorX?: (x: number | null) => void;
    snapToLines: boolean;
    onSnapToLinesChange?: (value: boolean) => void;
    hoveredVariable: string | null;
  } = $props();

  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let xAxis: HTMLCanvasElement;
  let yAxis: HTMLCanvasElement;
  let plot: UnifiedLinePlot | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let resizeVersion = $state(0);
  let localCursorVisible = $state(false);
  let crosshairX = $state(0);
  let crosshairY = $state(0);
  let crosshairLabel = $state("");
  let snapPointVisible = $state(false);
  let isZoomed = $state(false);
  let crosshairVisible = $derived(cursorEnabled && (localCursorVisible || externalCursorX !== null));
  const colorCache = new Map<string, [number, number, number, number]>();
  let renderedLines: PlotLine[] = [];
  let scales = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  let baseScales = scales;
  let dragging = false;
  let selecting = $state(false);
  let dragStartX = 0;
  let dragOffsetX = 0;
  let selectionStartX = $state(0);
  let selectionEndX = $state(0);
  let renderedSchema = "";
  const activePointers = new SvelteMap<number, { x: number; y: number }>();
  let pinchStart: { distance: number; scaleX: number; offsetX: number; centerX: number } | null = null;
  let lastTouchTap = { at: 0, x: 0, y: 0 };
  let gestureMoved = false;
  let interactionHint = $derived(
    inputProfile === "trackpad"
      ? (isZoomed ? "Scroll to pan • Drag to zoom • Double-click to reset" : "Drag to zoom • Ctrl+scroll to zoom • Double-click to reset")
      : inputProfile === "mouse"
        ? (isZoomed ? "Scroll wheel to pan • Drag to zoom • Double-click to reset" : "Shift+scroll or drag to zoom • Double-click to reset")
        : (isZoomed ? "Single-finger drag to pan • Pinch to zoom • Double-tap to reset" : "Pinch to zoom • Double-tap to reset"),
  );

  function lineColor(name: string, base: [number, number, number, number], alpha: number) {
    const faded = hoveredVariable && hoveredVariable !== name;
    return [base[0], base[1], base[2], faded ? alpha * .16 : alpha] as [number, number, number, number];
  }

  function lineWidth(name: string, thickness: number) {
    return hoveredVariable === name ? thickness * 1.7 : thickness;
  }

  function buildLines(): PlotLine[] {
    const aggregated = result as AggregatedResult;
    const lines: PlotLine[] = [];
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
          const thickness = emphasized ? lineThickness * 1.6 : lineThickness;
          lines.push({ points, color: lineColor(name, base, emphasized ? 1 : .18), thickness: lineWidth(name, thickness), enabled: true, variableName: name, parameterIndex: sweep.parameterIndex });
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
      const base = generatePlotColor(name, isDarkMode, colorCache);
      lines.push({ points, color: lineColor(name, base, 1), thickness: lineWidth(name, lineThickness), enabled: true, variableName: name });
    }
    return lines;
  }

  function renderAxes() {
    renderXAxis({ canvas: xAxis, scale: scales.scaleX, offset: scales.offsetX, isDarkMode, isLogX, isLogY });
    renderYAxis({ canvas: yAxis, scale: scales.scaleY, offset: scales.offsetY, isDarkMode, isLogX, isLogY });
  }

  function clampOffset(scaleX: number, offsetX: number) {
    if (scaleX <= baseScales.scaleX) return baseScales.offsetX;
    const originalMin = (-1 - baseScales.offsetX) / baseScales.scaleX;
    const originalMax = (1 - baseScales.offsetX) / baseScales.scaleX;
    return Math.max(1 - originalMax * scaleX, Math.min(-1 - originalMin * scaleX, offsetX));
  }

  function applyScales(next: typeof scales, notify = true) {
    if (!plot || !gl) return;
    const scaleX = Math.max(baseScales.scaleX, Math.min(baseScales.scaleX * 1_000_000, next.scaleX));
    scales = { ...next, scaleX, offsetX: clampOffset(scaleX, next.offsetX) };
    plot.setGlobalTransform([scales.scaleX, scales.scaleY], [scales.offsetX, scales.offsetY]);
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
    isZoomed = scales.scaleX > baseScales.scaleX * 1.0001;
    if (notify) onXTransform?.({ scaleX: scales.scaleX, offsetX: scales.offsetX });
  }

  function resetZoom() {
    applyScales({ ...baseScales });
  }

  function rebuild() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const previousScales = { ...scales };
    const schema = JSON.stringify([result.variableNames, selectedVariables, isLogX, isLogY]);
    const preserveXView = renderedSchema === schema && previousScales.scaleX > baseScales.scaleX * 1.0001;
    plot?.cleanup();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    gl = setupCanvasAndWebGL(canvas, { backgroundColor: [0, 0, 0, 0], antialias: true, powerPerformance: "high-performance", transparent: true, preserveDrawing: true });
    const lines = buildLines();
    renderedLines = lines;
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
      if (externalXTransform) {
        scales = { ...scales, scaleX: externalXTransform.scaleX, offsetX: clampOffset(externalXTransform.scaleX, externalXTransform.offsetX) };
      } else if (preserveXView) {
        scales = { ...scales, scaleX: Math.max(scales.scaleX, previousScales.scaleX), offsetX: clampOffset(Math.max(scales.scaleX, previousScales.scaleX), previousScales.offsetX) };
      }
    }
    renderedSchema = schema;
    plot.setGlobalTransform([scales.scaleX, scales.scaleY], [scales.offsetX, scales.offsetY]);
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
    isZoomed = scales.scaleX > baseScales.scaleX * 1.0001;
  }

  function pointerPosition(event: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: 1 - ((event.clientY - rect.top) / rect.height) * 2 };
  }

  function toCoordinate(value: number, logarithmic: boolean) {
    if (!logarithmic) return Number.isFinite(value) ? value : null;
    return value > 0 && Number.isFinite(value) ? Math.log10(value) : null;
  }

  function fromCoordinate(value: number, logarithmic: boolean) {
    return logarithmic ? 10 ** value : value;
  }

  function closestLinePoint(
    line: PlotLine,
    targetCoordinateX: number,
    targetScreenX: number,
    targetScreenY: number,
  ) {
    const point = interpolateLineAtX(line.points, targetCoordinateX, isLogX, isLogY);
    if (!point) return null;
    const { coordinateX, coordinateY } = point;
    const screenX = coordinateX * scales.scaleX + scales.offsetX;
    const screenY = coordinateY * scales.scaleY + scales.offsetY;
    return {
      ...point,
      distance: Math.hypot(screenX - targetScreenX, screenY - targetScreenY),
    };
  }

  function updateCrosshair(point: { x: number; y: number }) {
    if (!cursorEnabled) return;
    const coordinateX = (point.x - scales.offsetX) / scales.scaleX;
    const coordinateY = (point.y - scales.offsetY) / scales.scaleY;
    let x = coordinateX;
    let y = coordinateY;
    let rawX = fromCoordinate(x, isLogX);
    let rawY = fromCoordinate(y, isLogY);
    snapPointVisible = false;
    if (snapToLines) {
      let nearest: ReturnType<typeof closestLinePoint> = null;
      for (const line of renderedLines) {
        const candidate = closestLinePoint(line, coordinateX, point.x, point.y);
        if (candidate && (!nearest || candidate.distance < nearest.distance)) nearest = candidate;
      }
      if (nearest) {
        x = nearest.coordinateX;
        y = nearest.coordinateY;
        rawX = nearest.rawX;
        rawY = nearest.rawY;
        snapPointVisible = true;
      }
    }
    localCursorVisible = true;
    const screenX = x * scales.scaleX + scales.offsetX;
    crosshairX = ((screenX + 1) / 2) * 100;
    crosshairY = ((1 - (y * scales.scaleY + scales.offsetY)) / 2) * 100;
    crosshairLabel = `X: ${formatEngineering(rawX)}, Y: ${formatEngineering(rawY)}`;
    // Share normalized screen position so dual-canvas cursor guides stay
    // visually aligned even during a resize or transform synchronization frame.
    onCursorX?.(screenX);
  }

  function hideLocalCursor() {
    if (dragging) return;
    localCursorVisible = false;
    snapPointVisible = false;
    onCursorX?.(null);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const shouldZoom = event.ctrlKey || event.shiftKey;
    if (shouldZoom) {
      const point = pointerPosition(event);
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const dataX = (point.x - scales.offsetX) / scales.scaleX;
      const nextScaleX = Math.max(baseScales.scaleX, scales.scaleX * factor);
      applyScales({ ...scales, scaleX: nextScaleX, offsetX: point.x - dataX * nextScaleX });
      return;
    }
    if (scales.scaleX > baseScales.scaleX * 1.0001) {
      const rect = canvas.getBoundingClientRect();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      applyScales({ ...scales, offsetX: scales.offsetX - (delta / Math.max(1, rect.width)) * 2 });
    }
  }

  function handlePointerMove(event: PointerEvent) {
    const point = pointerPosition(event);
    updateCrosshair(point);
    activePointers.set(event.pointerId, point);
    if (activePointers.size === 2 && pinchStart) {
      const pointers = [...activePointers.values()];
      const first = pointers[0]!;
      const second = pointers[1]!;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (Math.abs(distance - pinchStart.distance) > .02) {
        gestureMoved = true;
        const centerX = (first.x + second.x) / 2;
        const anchorDataX = (pinchStart.centerX - pinchStart.offsetX) / pinchStart.scaleX;
        const nextScaleX = pinchStart.scaleX * (distance / pinchStart.distance);
        applyScales({ ...scales, scaleX: nextScaleX, offsetX: centerX - anchorDataX * nextScaleX });
      }
    } else if (selecting) {
      selectionEndX = point.x;
      if (Math.abs(selectionEndX - selectionStartX) > .01) gestureMoved = true;
    } else if (dragging) {
      const delta = point.x - dragStartX;
      if (Math.abs(delta) > .01) gestureMoved = true;
      applyScales({ ...scales, offsetX: dragOffsetX + delta });
    }
  }

  function handlePointerDown(event: PointerEvent) {
    canvas.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    if (activePointers.size === 0) gestureMoved = false;
    activePointers.set(event.pointerId, point);
    if (activePointers.size === 2) {
      const pointers = [...activePointers.values()];
      const first = pointers[0]!;
      const second = pointers[1]!;
      pinchStart = { distance: Math.max(.001, Math.hypot(first.x - second.x, first.y - second.y)), scaleX: scales.scaleX, offsetX: scales.offsetX, centerX: (first.x + second.x) / 2 };
      selecting = false;
      dragging = false;
      return;
    }
    dragStartX = point.x;
    dragOffsetX = scales.offsetX;
    if (inputProfile === "touchscreen" || event.pointerType === "touch") dragging = scales.scaleX > baseScales.scaleX * 1.0001;
    else {
      selecting = true;
      selectionStartX = point.x;
      selectionEndX = point.x;
    }
  }

  function handlePointerUp(event: PointerEvent) {
    const point = activePointers.get(event.pointerId) ?? pointerPosition(event);
    activePointers.delete(event.pointerId);
    if (selecting) {
      const left = Math.min(selectionStartX, selectionEndX);
      const right = Math.max(selectionStartX, selectionEndX);
      if (right - left > .03) {
        const min = (left - scales.offsetX) / scales.scaleX;
        const max = (right - scales.offsetX) / scales.scaleX;
        const nextScaleX = 2 / (max - min);
        applyScales({ ...scales, scaleX: nextScaleX, offsetX: -1 - min * nextScaleX });
      }
    }
    if (event.pointerType === "touch" && !gestureMoved && activePointers.size === 0) {
      const now = Date.now();
      if (now - lastTouchTap.at < 350 && Math.hypot(point.x - lastTouchTap.x, point.y - lastTouchTap.y) < .08) applyScales({ ...baseScales });
      lastTouchTap = { at: now, x: point.x, y: point.y };
    }
    selecting = false;
    dragging = false;
    pinchStart = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (activePointers.size === 1) {
      const remaining = [...activePointers.values()][0]!;
      dragStartX = remaining.x;
      dragOffsetX = scales.offsetX;
      dragging = scales.scaleX > baseScales.scaleX * 1.0001;
    }
  }

  onMount(() => {
    let observedWidth = 0;
    let observedHeight = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width === observedWidth && height === observedHeight) return;
      observedWidth = width;
      observedHeight = height;
      resizeVersion += 1;
    });
    observer.observe(host);
    return () => { observer.disconnect(); plot?.cleanup(); };
  });

  $effect(() => {
    JSON.stringify(result.variableNames);
    result.data.map((series) => series.values.length).join(",");
    (result as AggregatedResult).bracketPlotData?.length;
    JSON.stringify(selectedVariables);
    isDarkMode; isLogX; isLogY; lineThickness; emphasizedPlotIndex; hoveredVariable; resizeVersion;
    const frame = requestAnimationFrame(rebuild);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    externalXTransform?.revision;
    if (externalXTransform && plot && (Math.abs(scales.scaleX - externalXTransform.scaleX) > 1e-9 || Math.abs(scales.offsetX - externalXTransform.offsetX) > 1e-9)) {
      applyScales({ ...scales, scaleX: externalXTransform.scaleX, offsetX: externalXTransform.offsetX }, false);
    }
  });

  $effect(() => {
    if (!cursorEnabled) {
      localCursorVisible = false;
      snapPointVisible = false;
      return;
    }
    if (localCursorVisible || externalCursorX === null) return;
    crosshairX = ((externalCursorX + 1) / 2) * 100;
    const coordinateX = (externalCursorX - scales.offsetX) / scales.scaleX;
    crosshairLabel = `X: ${formatEngineering(fromCoordinate(coordinateX, isLogX))}`;
  });
</script>

<div class="plot-grid" bind:this={host}>
  <canvas class="plot-y-axis" bind:this={yAxis}></canvas>
  <div class="plot-surface">
    <canvas
      class="plot-webgl"
      data-canvas-id={canvasId}
      data-hovered-variable={hoveredVariable ?? ""}
      bind:this={canvas}
      onwheel={handleWheel}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerUp}
      onpointerleave={hideLocalCursor}
      ondblclick={resetZoom}
    ></canvas>
    {#if crosshairVisible}
      <span class="crosshair-v" data-cursor-x={crosshairX.toFixed(4)} style:left={`${crosshairX}%`}></span>
      {#if localCursorVisible}<span class="crosshair-h" style:top={`${crosshairY}%`}></span>{/if}
      {#if snapPointVisible && localCursorVisible}<span class="crosshair-snap-dot" data-snap-marker data-snap-x={crosshairX.toFixed(4)} style:left={`${crosshairX}%`} style:top={`${crosshairY}%`}></span>{/if}
      <output class="crosshair-label">{crosshairLabel}</output>
    {/if}
    <button
      class:active={snapToLines}
      class="plot-snap-button"
      aria-label="Toggle cursor snapping"
      aria-pressed={snapToLines}
      title={snapToLines ? "Crosshair snaps to curves (click for free movement)" : "Crosshair moves freely (click to snap to curves)"}
      onclick={() => onSnapToLinesChange?.(!snapToLines)}
    >
      {#if snapToLines}<MapPin size={14} aria-hidden="true" />Snap{:else}<Crosshair size={14} aria-hidden="true" />Free{/if}
    </button>
    {#if isZoomed}<button class="plot-reset-zoom" aria-label="Reset zoom" onclick={resetZoom}>Reset Zoom</button>{/if}
    {#if !crosshairVisible}<small class="plot-interaction-hint">{interactionHint}</small>{/if}
    {#if selecting}<span class="zoom-selection" style:left={`${((Math.min(selectionStartX, selectionEndX) + 1) / 2) * 100}%`} style:width={`${(Math.abs(selectionEndX - selectionStartX) / 2) * 100}%`}></span>{/if}
  </div>
  <span class="plot-axis-corner" aria-hidden="true"></span>
  <canvas class="plot-x-axis" bind:this={xAxis}></canvas>
</div>
