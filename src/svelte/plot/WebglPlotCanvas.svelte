<script lang="ts">
  import { onMount } from "svelte";
  import { Crosshair, MapPin } from "@lucide/svelte";
  import { SvelteMap } from "svelte/reactivity";
  import type { ResultType } from "eecircuit-engine";
  import { clearCanvas, setupCanvasAndWebGL, UnifiedLinePlot, type LineConfig } from "webgl-plot";
  import type { AggregatedResult } from "../../components/ScientificPlot/types";
  import { BRACKET_PLOT_STYLES, getBracketTransparency } from "../../components/ScientificPlot/bracketPlotStyles";
  import { renderXAxis, renderYAxis } from "../../components/ScientificPlot/plotcanvas/axis/axisRenderer";
  import { generatePlotColor } from "../../components/ScientificPlot/plotcanvas/styling/colorUtils";
  import { axisTransform, plotCoordinate, plotSegments, type SharedPlotTransform } from "../../utils/plotCoordinates";
  import { plotUnit, plotAxisLabel, formatPlotValue } from "../../utils/plotUnits";
  import { interpolateLineAtX } from "../../utils/cursorSnap";

  type PlotLine = LineConfig & { variableName: string; parameterIndex?: number };

  let {
    result,
    generation,
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
    generation: number;
    selectedVariables: string[];
    isDarkMode: boolean;
    isLogX: boolean;
    isLogY: boolean;
    inputProfile: "mouse" | "trackpad" | "touchscreen";
    lineThickness: number;
    canvasId: number;
    emphasizedPlotIndex?: number;
    externalXTransform?: SharedPlotTransform;
    onXTransform?: (transform: Omit<SharedPlotTransform, "revision">) => void;
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
  let verticalCursor: HTMLSpanElement;
  let horizontalCursor: HTMLSpanElement;
  let snapMarker: HTMLSpanElement;
  let cursorLabel: HTMLOutputElement;
  let interactionHintElement: HTMLElement;
  let localCursorVisible = false;
  let lastCursorPoint: { x: number; y: number } | null = null;
  let renderedGeneration = -1;
  let snapPointVisible = false;
  let isZoomed = $state(false);
  let hasVisibleData = $state(false);
  let xUnit = $derived(plotUnit(result.variableNames[0] ?? "", result.data[0]?.type));
  let yUnits = $derived(selectedVariables.map(unitForVariable));
  let yUnit = $derived([...new Set(yUnits.filter(Boolean))].join(", "));
  let xTitle = $derived(plotAxisLabel(xUnit === "Hz" ? "Frequency" : xUnit === "s" ? "Time" : (result.variableNames[0] ?? "X"), [xUnit]));
  let yTitle = $derived(plotAxisLabel(yUnits.length && yUnits.every((unit) => unit === "°") ? "Phase" : selectedVariables.some((name) => name.endsWith("[mag]")) ? "Magnitude" : "Value", yUnits));

  function unitForVariable(name: string): string {
    return plotUnit(name, result.data.find((series) => series.name === name)?.type);
  }

  function compatibleTransform() {
    return externalXTransform?.generation === generation && externalXTransform.logX === isLogX
      ? externalXTransform : undefined;
  }

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
  let rebuildCount = 0;
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

  function styleForLine(line: Pick<PlotLine, "variableName" | "parameterIndex">) {
    const base = generatePlotColor(line.variableName, isDarkMode, colorCache);
    const isBracketLine = line.parameterIndex !== undefined;
    const isEmphasized = isBracketLine && line.parameterIndex === emphasizedPlotIndex;
    const alpha = isBracketLine ? getBracketTransparency({ isDarkMode, isEmphasized }) : 1;
    const thickness = isBracketLine
      ? (isEmphasized ? BRACKET_PLOT_STYLES.EMPHASIZED_LINE_THICKNESS : BRACKET_PLOT_STYLES.NORMAL_LINE_THICKNESS)
      : lineThickness;
    return {
      color: lineColor(line.variableName, base, alpha),
      thickness: lineWidth(line.variableName, thickness),
    };
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
          const metadata = { variableName: name, parameterIndex: sweep.parameterIndex };
          for (const segment of plotSegments(points, isLogX, isLogY)) {
            lines.push({ points: segment, ...styleForLine(metadata), enabled: true, ...metadata });
          }
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
      const metadata = { variableName: name };
      for (const segment of plotSegments(points, isLogX, isLogY)) {
        lines.push({ points: segment, ...styleForLine(metadata), enabled: true, ...metadata });
      }
    }
    return lines;
  }

  function renderAxes() {
    renderXAxis({ canvas: xAxis, scale: scales.scaleX, offset: scales.offsetX, isDarkMode, isLogX, isLogY });
    renderYAxis({ canvas: yAxis, scale: scales.scaleY, offset: scales.offsetY, isDarkMode, isLogX, isLogY, unit: yUnit });
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
    canvas.dataset.scaleX = String(scales.scaleX);
    canvas.dataset.offsetX = String(scales.offsetX);
    canvas.dataset.scaleY = String(scales.scaleY);
    canvas.dataset.offsetY = String(scales.offsetY);
    plot.setGlobalTransform([scales.scaleX, scales.scaleY], [scales.offsetX, scales.offsetY]);
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
    isZoomed = scales.scaleX > baseScales.scaleX * 1.0001;
    if (notify) onXTransform?.({ scaleX: scales.scaleX, offsetX: scales.offsetX, generation, logX: isLogX });
  }

  function resetZoom() {
    applyScales({ ...baseScales });
  }

  function updateLineStyles() {
    if (!plot || !gl) return;
    renderedLines.forEach((line, index) => {
      const style = styleForLine(line);
      line.color = style.color;
      line.thickness = style.thickness;
      plot?.updateLineColor(index, style.color);
      plot?.updateLineThickness(index, style.thickness);
    });
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
  }

  function rebuild() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const previousScales = { ...scales };
    rebuildCount += 1;
    canvas.dataset.rebuildCount = String(rebuildCount);
    const schema = JSON.stringify([generation, result.variableNames[0], isLogX]);
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
    // X is shared even when a canvas has no selected/valid Y samples.
    const aggregated = result as AggregatedResult;
    const xSeries = aggregated.bracketPlotData?.length
      ? aggregated.bracketPlotData.map((sweep) => sweep.data[0]?.values ?? [])
      : [result.data[0]?.values ?? []];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const values of xSeries) for (const value of values) {
      const coordinate = plotCoordinate(Number(value), isLogX);
      if (coordinate === null) continue;
      minX = Math.min(minX, coordinate);
      maxX = Math.max(maxX, coordinate);
    }
    for (const line of lines) for (let index = 1; index < line.points.length; index += 2) {
      const coordinate = plotCoordinate(line.points[index]!, isLogY);
      if (coordinate === null) continue;
      minY = Math.min(minY, coordinate);
      maxY = Math.max(maxY, coordinate);
    }
    const x = axisTransform(minX, maxX);
    const y = axisTransform(minY, maxY);
    scales = { scaleX: x.scale, offsetX: x.offset, scaleY: y.scale, offsetY: y.offset };
    baseScales = { ...scales };
    const external = compatibleTransform();
    const previous = external ?? (preserveXView ? previousScales : undefined);
    if (previous) {
      const scaleX = Math.max(baseScales.scaleX, Math.min(baseScales.scaleX * 1_000_000, previous.scaleX));
      scales = { ...scales, scaleX, offsetX: clampOffset(scaleX, previous.offsetX) };
    }
    hasVisibleData = lines.length > 0;
    if (renderedGeneration !== generation) lastCursorPoint = null;
    renderedGeneration = generation;
    renderedSchema = schema;
    canvas.dataset.scaleX = String(scales.scaleX);
    canvas.dataset.offsetX = String(scales.offsetX);
    canvas.dataset.scaleY = String(scales.scaleY);
    canvas.dataset.offsetY = String(scales.offsetY);
    plot.setGlobalTransform([scales.scaleX, scales.scaleY], [scales.offsetX, scales.offsetY]);
    clearCanvas(gl, [0, 0, 0, 0]);
    plot.draw();
    renderAxes();
    isZoomed = scales.scaleX > baseScales.scaleX * 1.0001;
    // A queued rebuild may run after a pointer event; refresh the readout instead of hiding it.
    if (cursorEnabled && lastCursorPoint) updateCrosshair(lastCursorPoint);
    else {
      localCursorVisible = false;
      hideCursorElements();
    }
  }

  function pointerPosition(event: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: 1 - ((event.clientY - rect.top) / rect.height) * 2 };
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
    // Segments are separated at invalid samples: do not snap to an endpoint across a gap.
    const firstX = plotCoordinate(line.points[0]!, isLogX);
    const lastX = plotCoordinate(line.points[line.points.length - 2]!, isLogX);
    if (firstX === null || lastX === null || targetCoordinateX < Math.min(firstX, lastX) || targetCoordinateX > Math.max(firstX, lastX)) return null;
    const point = interpolateLineAtX(line.points, targetCoordinateX, isLogX, isLogY);
    if (!point) return null;
    const { coordinateX, coordinateY } = point;
    const screenX = coordinateX * scales.scaleX + scales.offsetX;
    const screenY = coordinateY * scales.scaleY + scales.offsetY;
    return {
      ...point,
      unit: unitForVariable(line.variableName),
      distance: Math.hypot(screenX - targetScreenX, screenY - targetScreenY),
    };
  }

  function updateCrosshair(point: { x: number; y: number }) {
    if (!cursorEnabled) return;
    lastCursorPoint = point;
    const coordinateX = (point.x - scales.offsetX) / scales.scaleX;
    const coordinateY = (point.y - scales.offsetY) / scales.scaleY;
    let x = coordinateX;
    let y = coordinateY;
    let rawX = fromCoordinate(x, isLogX);
    let rawY = fromCoordinate(y, isLogY);
    let cursorUnit = yUnit;
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
        cursorUnit = nearest.unit;
      }
    }
    localCursorVisible = true;
    const screenX = x * scales.scaleX + scales.offsetX;
    const crosshairX = ((screenX + 1) / 2) * 100;
    const crosshairY = ((1 - (y * scales.scaleY + scales.offsetY)) / 2) * 100;
    renderCursor(crosshairX, crosshairY, `X: ${formatPlotValue(rawX, xUnit)}, Y: ${formatPlotValue(rawY, cursorUnit)}`, true, snapPointVisible);
    // Share normalized screen position so dual-canvas cursor guides stay
    // visually aligned even during a resize or transform synchronization frame.
    onCursorX?.(screenX);
  }

  function renderCursor(xPercent: number, yPercent: number, label: string, showHorizontal: boolean, showSnap: boolean) {
    if (!verticalCursor || !horizontalCursor || !snapMarker || !cursorLabel || !interactionHintElement) return;
    verticalCursor.hidden = false;
    verticalCursor.style.left = `${xPercent}%`;
    verticalCursor.dataset.cursorX = xPercent.toFixed(4);
    horizontalCursor.hidden = !showHorizontal;
    horizontalCursor.style.top = `${yPercent}%`;
    snapMarker.hidden = !showSnap;
    snapMarker.style.left = `${xPercent}%`;
    snapMarker.style.top = `${yPercent}%`;
    snapMarker.dataset.snapX = xPercent.toFixed(4);
    cursorLabel.hidden = false;
    // Pointer-rate output bypasses Svelte state so large plots keep a smooth crosshair.
    // eslint-disable-next-line svelte/no-dom-manipulating
    cursorLabel.textContent = label;
    interactionHintElement.hidden = true;
  }

  function hideCursorElements() {
    if (!verticalCursor || !horizontalCursor || !snapMarker || !cursorLabel || !interactionHintElement) return;
    verticalCursor.hidden = true;
    horizontalCursor.hidden = true;
    snapMarker.hidden = true;
    cursorLabel.hidden = true;
    interactionHintElement.hidden = false;
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
    if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, point);
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
      return;
    } else if (selecting) {
      selectionEndX = point.x;
      if (Math.abs(selectionEndX - selectionStartX) > .01) gestureMoved = true;
      return;
    } else if (dragging) {
      const delta = point.x - dragStartX;
      if (Math.abs(delta) > .01) gestureMoved = true;
      applyScales({ ...scales, offsetX: dragOffsetX + delta });
      return;
    }
    updateCrosshair(point);
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== "touch" && event.button !== 0 && event.button !== 2) return;
    if (event.button === 2) event.preventDefault();
    const point = pointerPosition(event);
    if (activePointers.size === 0) gestureMoved = false;
    activePointers.set(event.pointerId, point);
    canvas.setPointerCapture(event.pointerId);
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
    if (event.button === 2) {
      dragging = scales.scaleX > baseScales.scaleX * 1.0001;
      selecting = false;
    } else if (inputProfile === "touchscreen" || event.pointerType === "touch") dragging = scales.scaleX > baseScales.scaleX * 1.0001;
    else {
      selecting = true;
      selectionStartX = point.x;
      selectionEndX = point.x;
    }
  }

  function cancelPointerInteraction(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    selecting = false;
    dragging = false;
    pinchStart = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }

  function handlePointerLeave(event: PointerEvent) {
    // Chakra retained the last cursor readout on leave. Only cancel an input
    // operation whose buttons are no longer pressed.
    if (event.buttons === 0 && (selecting || dragging)) cancelPointerInteraction(event);
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
    result;
    JSON.stringify(result.variableNames);
    result.data.map((series) => series.values.length).join(",");
    const bracketData = (result as AggregatedResult).bracketPlotData;
    bracketData;
    bracketData?.length;
    JSON.stringify(selectedVariables);
    generation; isLogX; isLogY; resizeVersion;
    const frame = requestAnimationFrame(rebuild);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    isDarkMode; lineThickness; emphasizedPlotIndex; hoveredVariable;
    const frame = requestAnimationFrame(updateLineStyles);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    externalXTransform?.revision;
    const external = compatibleTransform();
    // A pending rebuild still owns the old coordinate space.
    if (external && renderedSchema === JSON.stringify([generation, result.variableNames[0], isLogX]) && plot && (Math.abs(scales.scaleX - external.scaleX) > 1e-9 || Math.abs(scales.offsetX - external.offsetX) > 1e-9)) {
      applyScales({ ...scales, scaleX: external.scaleX, offsetX: external.offsetX }, false);
    }
  });

  $effect(() => {
    if (!cursorEnabled) {
      lastCursorPoint = null;
      localCursorVisible = false;
      snapPointVisible = false;
      hideCursorElements();
      return;
    }
    if (localCursorVisible || externalCursorX === null) return;
    const crosshairX = ((externalCursorX + 1) / 2) * 100;
    const coordinateX = (externalCursorX - scales.offsetX) / scales.scaleX;
    renderCursor(crosshairX, 0, `X: ${formatPlotValue(fromCoordinate(coordinateX, isLogX), xUnit)}`, false, false);
  });
</script>

<div class="plot-axis-titles"><span>{yTitle}</span><span>{xTitle}</span></div>
<div class="plot-grid" bind:this={host}>
  <canvas class="plot-y-axis" aria-label={yTitle} bind:this={yAxis}></canvas>
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
      onpointercancel={cancelPointerInteraction}
      onpointerleave={handlePointerLeave}
      oncontextmenu={(event) => { if (isZoomed) event.preventDefault(); }}
      ondblclick={resetZoom}
    ></canvas>
    <span bind:this={verticalCursor} hidden class="crosshair-v"></span>
    <span bind:this={horizontalCursor} hidden class="crosshair-h"></span>
    <span bind:this={snapMarker} hidden class="crosshair-snap-dot" data-snap-marker></span>
    <output bind:this={cursorLabel} hidden class="crosshair-label"></output>
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
    {#if !hasVisibleData}<span class="plot-empty">No plottable samples</span>{/if}
    <small bind:this={interactionHintElement} class="plot-interaction-hint">{interactionHint}</small>
    {#if selecting}<span class="zoom-selection" style:left={`${((Math.min(selectionStartX, selectionEndX) + 1) / 2) * 100}%`} style:width={`${(Math.abs(selectionEndX - selectionStartX) / 2) * 100}%`}></span>{/if}
  </div>
  <span class="plot-axis-corner" aria-hidden="true"></span>
  <canvas class="plot-x-axis" aria-label={xTitle} bind:this={xAxis}></canvas>
</div>

<style>
  .plot-axis-titles { display: flex; justify-content: space-between; gap: .5rem; padding: .15rem .5rem; color: var(--fg-muted); font-size: .75rem; }
  .plot-empty { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: var(--fg-muted); pointer-events: none; }
</style>
