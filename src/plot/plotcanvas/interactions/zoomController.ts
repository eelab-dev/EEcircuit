import type { WebglLinePlot, WebglPolygonPlot } from "webgl-plot";

// Log axis state interface for coordinate space conversion
interface LogAxisState {
  isLogX: boolean;
  isLogY: boolean;
}

/**
 * HIGH-PERFORMANCE ZOOM CONTROLLER FOR WEBGL PLOT CANVAS
 *
 * Handles zoom and pan operations with optimized performance:
 * - Direct webgl-plot updates for zoom visuals (no React re-renders)
 * - Real-time panning via webgl redraw callbacks
 * - Smooth scroll wheel panning without React overhead
 * - Dual canvas synchronization with minimal React state updates
 * - Pan bounds limiting to prevent empty axis areas
 *
 * Performance optimizations:
 * - webglRedrawCallback enables direct canvas updates during real-time operations
 * - React re-renders only triggered for major state changes (zoom complete, pan end)
 * - All visual feedback (zoom selection, pan movement) handled via webgl-plot directly
 *
 * IMPORTANT BUG PREVENTION:
 * To prevent empty axis areas when panning outside data bounds:
 * 1. ALWAYS call setOriginalDataBounds() with the full data range when plot data changes
 * 2. Pan limiting automatically constrains view to stay within original data bounds
 * 3. This prevents users from panning into areas with no data points
 *
 * Independent of React lifecycle for maximum performance during user interactions.
 */
export class ZoomController {
  private isZooming = false;
  private zoomStartX: number | null = null;
  private zoomEndX: number | null = null;
  private customXBounds: { min: number; max: number } | null = null;

  // Callback for zoom state synchronization
  private onZoomStateChangeCb:
    | ((zoomState: {
      isZooming: boolean;
      zoomStartX: number | null;
      zoomEndX: number | null;
      zoomBounds: { min: number; max: number } | null;
    }) => void)
    | null = null;

  // Callback for pan offset synchronization
  private onPanOffsetChangeCb: ((panOffset: number) => void) | null = null;

  // Callback for direct webgl redraw (no React re-render)
  private onWebglRedrawCb: (() => void) | null = null;

  // Flag to prevent infinite loops when applying external changes
  private isApplyingExternalPanOffset = false;

  // Panning state for horizontal movement when zoomed
  private isPanning = false;
  private panStartX: number | null = null;
  private panOffsetX = 0; // Current accumulated pan offset in data coordinates

  // Original data bounds for pan limiting
  private originalDataBounds: { min: number; max: number } | null = null;

  // WebGL references - can be thin or thick lines
  private zoomLinesRef: WebglLinePlot | null = null;
  private zoomRegionRef: WebglPolygonPlot | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  // Axis scaling information needed for coordinate conversion
  private axisScales = {
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  };

  // Log axis state for coordinate space conversion
  private logAxisState: LogAxisState = {
    isLogX: false,
    isLogY: false,
  };

  /**
   * Initialize zoom controller with WebGL components
   * @param zoomLines WebGL line plotter for zoom indicator lines
   * @param zoomRegion WebGL polygon plotter for zoom region highlight
   * @param canvas HTML canvas element for coordinate calculations
   * @param isDarkMode Whether dark mode is active for theme-appropriate colors
   */
  initialize(
    zoomLines: WebglLinePlot,
    zoomRegion: WebglPolygonPlot,
    canvas: HTMLCanvasElement,
    isDarkMode: boolean = true
  ): void {
    this.zoomLinesRef = zoomLines;
    this.zoomRegionRef = zoomRegion;
    this.canvasElement = canvas;

    // Initialize zoom visual components with theme-appropriate colors
    this.initializeZoomVisuals(isDarkMode);

    console.log("ZoomController initialized");
  }

  /**
   * Update axis scaling information for coordinate conversion
   * Called when plot scaling changes
   */
  updateAxisScales(scales: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  }): void {
    this.axisScales = { ...scales };
  }

  /**
   * Update log axis state for coordinate space conversion
   * Called when log axis settings change
   */
  updateLogAxisState(logState: LogAxisState): void {
    this.logAxisState = { ...logState };
  }

  /**
   * Convert mouse position to data coordinates considering log spaces
   * Similar to crosshair coordinate conversion logic
   */
  private convertMouseToDataCoordinates(mouseNdcX: number, mouseNdcY: number): { dataX: number; dataY: number } {
    // Convert NDC to data coordinates using current axis scales
    const dataX = (mouseNdcX - this.axisScales.offsetX) / this.axisScales.scaleX;
    const dataY = (mouseNdcY - this.axisScales.offsetY) / this.axisScales.scaleY;

    // Note: Data coordinates are already in log space when log axes are enabled
    // The plot calculations handle the log transformation, so we work with the
    // log values directly for zoom bounds and operations
    
    return { dataX, dataY };
  }

  /**
   * Convert data coordinates to display coordinates (linear space)
   * Used for pan bounds limiting and external communication
   */
  private convertDataToDisplayCoordinates(dataX: number, dataY: number): { displayX: number; displayY: number } {
    let displayX = dataX;
    let displayY = dataY;

    // Convert from log space back to linear space for display/bounds checking
    if (this.logAxisState.isLogX && dataX !== undefined && isFinite(dataX)) {
      displayX = Math.pow(10, dataX);
    }
    if (this.logAxisState.isLogY && dataY !== undefined && isFinite(dataY)) {
      displayY = Math.pow(10, dataY);
    }

    return { displayX, displayY };
  }

  /**
   * Convert display coordinates (linear space) to data coordinates (log space)
   * Used for setting bounds from external sources
   */
  private convertDisplayToDataCoordinates(displayX: number, displayY: number): { dataX: number; dataY: number } {
    let dataX = displayX;
    let dataY = displayY;

    // Convert from linear space to log space
    if (this.logAxisState.isLogX && displayX > 0) {
      dataX = Math.log10(displayX);
    }
    if (this.logAxisState.isLogY && displayY > 0) {
      dataY = Math.log10(displayY);
    }

    return { dataX, dataY };
  }

  /**
   * Check if original data bounds have been set
   * Used to prevent excessive calls to setOriginalDataBounds()
   */
  hasOriginalDataBounds(): boolean {
    return this.originalDataBounds !== null;
  }

  /**
   * Set the original data bounds for pan limiting
   *
   * CRITICAL: This method prevents the "empty axis areas" bug by constraining
   * pan operations to stay within the original data range.
   *
   * @param min Minimum X value of the original data (in current coordinate space)
   * @param max Maximum X value of the original data (in current coordinate space)
   *
   * NOTE: The bounds should be in the same coordinate space as the current plot data.
   * When log axis is enabled, the bounds should be in log space (log10 values).
   * When linear axis is used, the bounds should be in linear space.
   * This matches how the plot calculations handle coordinate transformations.
   *
   * When to call:
   * - Once when plot data is first loaded/calculated
   * - When plot data changes (new simulation results, etc.)
   * - Should be called from usePlotCalculations when calculating full data bounds
   *
   * What it prevents:
   * - Users panning outside data bounds and seeing empty axis tick marks
   * - Axis showing values where no data points exist
   * - Confusing empty areas to the left/right of actual plot data
   */
  setOriginalDataBounds(min: number, max: number): void {
    this.originalDataBounds = { min, max };
  }

  /**
   * Set zoom state change callback for synchronization
   */
  setZoomStateCallback(
    callback:
      | ((zoomState: {
        isZooming: boolean;
        zoomStartX: number | null;
        zoomEndX: number | null;
        zoomBounds: { min: number; max: number } | null;
      }) => void)
      | null
  ): void {
    this.onZoomStateChangeCb = callback;
  }

  /**
   * Set pan offset change callback for synchronization
   */
  setPanOffsetCallback(callback: ((panOffset: number) => void) | null): void {
    this.onPanOffsetChangeCb = callback;
  }

  /**
   * Set webgl redraw callback for direct canvas updates (no React re-render)
   */
  setWebglRedrawCallback(callback: (() => void) | null): void {
    this.onWebglRedrawCb = callback;
  }

  /**
   * Notify about zoom state changes for synchronization
   */
  private notifyZoomStateChange(): void {
    if (this.onZoomStateChangeCb) {
      this.onZoomStateChangeCb({
        isZooming: this.isZooming,
        zoomStartX: this.zoomStartX,
        zoomEndX: this.zoomEndX,
        zoomBounds: this.customXBounds ? { ...this.customXBounds } : null,
      });
    }
  }

  /**
   * Notify about pan offset changes for synchronization
   */
  private notifyPanOffsetChange(): void {
    // Don't notify if we're currently applying an external pan offset
    if (this.onPanOffsetChangeCb && !this.isApplyingExternalPanOffset) {
      this.onPanOffsetChangeCb(this.panOffsetX);
    }
  }

  /**
   * Trigger direct webgl redraw (no React re-render)
   */
  private triggerWebglRedraw(): void {
    if (this.onWebglRedrawCb) {
      this.onWebglRedrawCb();
    }
  }

  /**
   * Apply external zoom state for synchronization
   */
  applyExternalZoomState(zoomState: {
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  }): void {
    this.isZooming = zoomState.isZooming;
    this.zoomStartX = zoomState.zoomStartX;
    this.zoomEndX = zoomState.zoomEndX;
    this.customXBounds = zoomState.zoomBounds
      ? { ...zoomState.zoomBounds }
      : null;

    // Update visual feedback if zooming
    if (this.isZooming && this.zoomStartX !== null && this.zoomEndX !== null) {
      this.showZoomVisuals(this.zoomStartX, this.zoomEndX);
    } else if (!this.isZooming) {
      // Hide visuals if not zooming
      this.hideZoomVisuals();
    }
  }

  /**
   * Apply external pan offset for synchronization
   */
  applyExternalPanOffset(panOffset: number): void {
    this.isApplyingExternalPanOffset = true;
    this.panOffsetX = panOffset;
    this.isApplyingExternalPanOffset = false;
  }

  /**
   * Get current zoom bounds (null if no zoom applied)
   * Returns bounds with pan offset applied
   */
  getZoomBounds(): { min: number; max: number } | null {
    if (!this.customXBounds) return null;

    // Apply pan offset to the zoom bounds
    return {
      min: this.customXBounds.min + this.panOffsetX,
      max: this.customXBounds.max + this.panOffsetX,
    };
  }

  /**
   * Check if currently in zooming mode
   */
  getIsZooming(): boolean {
    return this.isZooming;
  }

  /**
   * Check if currently in panning mode
   */
  getIsPanning(): boolean {
    return this.isPanning;
  }

  /**
   * Check if plot is currently zoomed in (has custom bounds)
   */
  isZoomedIn(): boolean {
    return this.customXBounds !== null;
  }

  /**
   * Start zoom selection at mouse position
   * @param mouseX Mouse X coordinate relative to canvas
   */
  startZoom(mouseX: number): void {
    if (!this.canvasElement) {
      console.warn("ZoomController: Canvas not initialized");
      return;
    }

    const rect = this.canvasElement.getBoundingClientRect();
    // Convert mouse X to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    
    // Convert mouse position to data coordinates considering log spaces
    const { dataX } = this.convertMouseToDataCoordinates(mouseNdcX, 0);

    this.isZooming = true;
    this.zoomStartX = dataX;
    this.zoomEndX = dataX;

    // Immediately show zoom visuals at start position
    this.showZoomVisuals(dataX, dataX);

    // Trigger direct webgl redraw for zoom visuals
    this.triggerWebglRedraw();

    // Notify about zoom state change
    this.notifyZoomStateChange();
  }

  /**
   * Update zoom selection as mouse moves
   * @param mouseX Current mouse X coordinate relative to canvas
   */
  updateZoomSelection(mouseX: number): void {
    if (!this.isZooming || !this.canvasElement || this.zoomStartX === null) {
      return;
    }

    const rect = this.canvasElement.getBoundingClientRect();
    // Convert mouse X to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    
    // Convert mouse position to data coordinates considering log spaces
    const { dataX } = this.convertMouseToDataCoordinates(mouseNdcX, 0);

    this.zoomEndX = dataX;

    // Update zoom visual feedback
    this.showZoomVisuals(this.zoomStartX, dataX);

    // Trigger direct webgl redraw for zoom visuals
    this.triggerWebglRedraw();

    // Notify about zoom state change
    this.notifyZoomStateChange();
  }

  /**
   * Complete zoom operation and apply new bounds
   * @returns The applied zoom bounds or null if zoom was cancelled
   */
  completeZoom(): { min: number; max: number } | null {
    if (!this.isZooming || this.zoomStartX === null || this.zoomEndX === null) {
      return null;
    }

    const minX = Math.min(this.zoomStartX, this.zoomEndX);
    const maxX = Math.max(this.zoomStartX, this.zoomEndX);

    let appliedBounds: { min: number; max: number } | null = null;

    // Only apply zoom if there's a meaningful selection (avoid tiny selections)
    if (Math.abs(maxX - minX) > 1e-10) {
      this.customXBounds = { min: minX, max: maxX };
      this.panOffsetX = 0; // Reset pan offset when applying new zoom bounds
      appliedBounds = { min: minX, max: maxX };
    }

    // Clear zoom state and hide visuals
    this.clearZoomState();

    // Notify about zoom state change
    this.notifyZoomStateChange();

    return appliedBounds;
  }

  /**
   * Cancel current zoom operation without applying
   */
  cancelZoom(): void {
    if (!this.isZooming) return;

    console.log("ZoomController: Cancelled zoom operation");
    this.clearZoomState();

    // Notify about zoom state change
    this.notifyZoomStateChange();
  }

  /**
   * Set custom zoom bounds directly
   * @param min Minimum X value
   * @param max Maximum X value
   */
  setZoomBounds(min: number, max: number): void {
    this.customXBounds = { min, max };
    this.panOffsetX = 0; // Reset pan offset when setting new bounds
    console.log("ZoomController: Set zoom bounds:", { min, max });

    // Notify about zoom state change
    this.notifyZoomStateChange();
  }

  /**
   * Reset zoom to show full data range
   * @returns True if zoom was reset, false if no zoom was active
   */
  resetZoom(): boolean {
    if (!this.customXBounds) {
      return false; // No zoom to reset
    }

    this.customXBounds = null;
    this.panOffsetX = 0; // Reset pan offset when zoom is reset

    // Notify about zoom state change
    this.notifyZoomStateChange();

    return true;
  }

  /**
   * Start horizontal panning operation
   * Only works when zoomed in
   * @param mouseX Mouse X coordinate relative to canvas
   */
  startPan(mouseX: number): void {
    if (!this.canvasElement || !this.customXBounds) {
      return; // Silently ignore if not ready for panning
    }

    const rect = this.canvasElement.getBoundingClientRect();
    // Convert mouse X to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    
    // Convert mouse position to data coordinates considering log spaces
    const { dataX } = this.convertMouseToDataCoordinates(mouseNdcX, 0);

    this.isPanning = true;
    this.panStartX = dataX;
  }

  /**
   * Update pan position as mouse moves
   * @param mouseX Current mouse X coordinate relative to canvas
   */
  updatePan(mouseX: number): void {
    if (!this.isPanning || !this.canvasElement || this.panStartX === null) {
      return;
    }

    const rect = this.canvasElement.getBoundingClientRect();
    // Convert mouse X to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    
    // Convert mouse position to data coordinates considering log spaces
    const { dataX: currentDataX } = this.convertMouseToDataCoordinates(mouseNdcX, 0);

    // Calculate pan delta (negative because dragging right should move view left)
    let panDelta = -(currentDataX - this.panStartX);

    // Limit panning to prevent moving too far outside original data bounds
    if (this.customXBounds && this.originalDataBounds) {
      // Prevent panning outside original data bounds entirely
      const minPanBound = this.originalDataBounds.min;
      const maxPanBound = this.originalDataBounds.max;

      // Calculate what the new bounds would be with this pan offset
      const newMin = this.customXBounds.min + panDelta;
      const newMax = this.customXBounds.max + panDelta;

      // Constrain the pan offset to keep view within data bounds
      if (newMin < minPanBound) {
        panDelta = minPanBound - this.customXBounds.min;
      } else if (newMax > maxPanBound) {
        panDelta = maxPanBound - this.customXBounds.max;
      }
    }

    this.panOffsetX = panDelta;
    this.notifyPanOffsetChange();

    // Trigger direct webgl redraw for smooth panning
    this.triggerWebglRedraw();
  }

  /**
   * End panning operation
   */
  endPan(): void {
    if (!this.isPanning) return;

    this.isPanning = false;
    this.panStartX = null;
  }

  /**
   * Handle horizontal scroll wheel for panning
   * @param deltaX Horizontal scroll delta from wheel event
   */
  handleHorizontalScroll(deltaX: number): void {
    if (!this.customXBounds) {
      return; // Silently ignore scroll when not zoomed in
    }

    // Calculate zoom range to determine appropriate scroll sensitivity
    const zoomRange = this.customXBounds.max - this.customXBounds.min;
    // Very slow scroll sensitivity - 1% of current view range per scroll unit
    const scrollSensitivity = zoomRange * 0.01;

    // Calculate new pan offset
    let newPanOffset = this.panOffsetX + deltaX * scrollSensitivity;

    // Limit panning to prevent moving too far outside original data bounds
    if (this.originalDataBounds) {
      // Prevent panning outside original data bounds entirely
      const minPanBound = this.originalDataBounds.min;
      const maxPanBound = this.originalDataBounds.max;

      // Calculate what the new bounds would be with this pan offset
      const newMin = this.customXBounds.min + newPanOffset;
      const newMax = this.customXBounds.max + newPanOffset;

      // Constrain the pan offset to keep view within reasonable bounds
      if (newMin < minPanBound) {
        newPanOffset = minPanBound - this.customXBounds.min;
      } else if (newMax > maxPanBound) {
        newPanOffset = maxPanBound - this.customXBounds.max;
      }
    }

    // Apply scroll delta to pan offset
    // Positive deltaX should pan right (positive offset)
    this.panOffsetX = newPanOffset;
    this.notifyPanOffsetChange();

    // Trigger direct webgl redraw for smooth scroll panning
    this.triggerWebglRedraw();
  }

  /**
   * Cleanup zoom controller and hide visuals
   * Should be called when component unmounts or plot is destroyed
   */
  cleanup(): void {
    this.clearZoomState();
    this.customXBounds = null;
    this.panOffsetX = 0; // Reset pan offset on cleanup

    // Don't null the refs as they might be reused
    console.log("ZoomController: Cleaned up");
  }

  /**
   * Get theme-appropriate zoom colors
   * @param isDarkMode Whether dark mode is active
   * @returns Fill color array [r, g, b, a]
   * @private
   */
  private getZoomColors(isDarkMode: boolean): [number, number, number, number] {
    // Use blue highlight for light mode, yellow for dark mode
    return isDarkMode
      ? [1, 1, 0, 0.2] // Semi-transparent yellow for dark mode
      : [0.4, 0.4, 0, 0.5]; // Semi-transparent yellow for light mode
  }

  /**
   * Initialize zoom visual components with theme-aware colors
   * @param isDarkMode Whether dark mode is active
   * @private
   */
  private initializeZoomVisuals(isDarkMode: boolean = true): void {
    if (!this.zoomLinesRef || !this.zoomRegionRef) return;

    try {
      // Initialize two vertical lines for zoom boundaries (initially disabled)
      const initialLinePoints = new Float32Array([0, -1, 0, 1]);

      this.zoomLinesRef.initLines([
        {
          points: initialLinePoints,
          color: [1, 1, 0, 0.8], // Yellow with transparency
          thickness: 2,
          enabled: false,
        },
        {
          points: initialLinePoints,
          color: [1, 1, 0, 0.8], // Yellow with transparency
          thickness: 2,
          enabled: false,
        },
      ]);

      // Initialize zoom region polygon (semi-transparent yellow rectangle)
      const initialRegionPoints = new Float32Array([
        0,
        -1, // bottom-left (triangle 1)
        0,
        1, // top-left (triangle 1)
        0,
        1, // top-right (triangle 1)
        0,
        -1, // bottom-left (triangle 2)
        0,
        1, // top-right (triangle 2)
        0,
        -1, // bottom-right (triangle 2)
      ]);

      this.zoomRegionRef.initPolygons([
        {
          points: initialRegionPoints,
          fillColor: this.getZoomColors(isDarkMode),
          strokeColor: [1, 1, 0, 0], // No stroke
          strokeWeight: 0,
          isFilled: true,
          isStroked: false,
          enabled: false,
        },
      ]);

      console.log("ZoomController: Initialized zoom visuals");
    } catch (error) {
      console.error(
        "ZoomController: Failed to initialize zoom visuals:",
        error
      );
    }
  }

  /**
   * Show zoom visuals between two data X coordinates
   * @private
   */
  private showZoomVisuals(startDataX: number, endDataX: number): void {
    if (!this.zoomLinesRef || !this.zoomRegionRef) return;

    try {
      // Enable zoom visuals
      this.zoomLinesRef.setLineEnabled(0, true);
      this.zoomLinesRef.setLineEnabled(1, true);
      this.zoomRegionRef.setPolygonEnabled(0, true);

      // Convert data coordinates back to NDC for rendering
      const startNdcX =
        startDataX * this.axisScales.scaleX + this.axisScales.offsetX;
      const endNdcX =
        endDataX * this.axisScales.scaleX + this.axisScales.offsetX;

      // Create vertical lines at start and end positions (full height)
      const startLinePoints = new Float32Array([startNdcX, -1, startNdcX, 1]);
      const endLinePoints = new Float32Array([endNdcX, -1, endNdcX, 1]);

      // Update vertical lines
      this.zoomLinesRef.updateLinePoints(0, startLinePoints);
      this.zoomLinesRef.updateLinePoints(1, endLinePoints);

      // Create yellow semi-transparent region between the lines
      const leftX = Math.min(startNdcX, endNdcX);
      const rightX = Math.max(startNdcX, endNdcX);

      // Create rectangle using two triangles to form a solid box
      // IMPORTANT: Must use exactly 6 points to match initialization (WebGL requirement)
      const regionPoints = new Float32Array([
        leftX,
        -1, // bottom-left (triangle 1)
        leftX,
        1, // top-left (triangle 1)
        rightX,
        1, // top-right (triangle 1)
        leftX,
        -1, // bottom-left (triangle 2)
        rightX,
        1, // top-right (triangle 2)
        rightX,
        -1, // bottom-right (triangle 2)
      ]);

      // Update zoom region polygon
      this.zoomRegionRef.updatePolygonPoints(0, regionPoints);
    } catch (error) {
      console.error("ZoomController: Failed to update zoom visuals:", error);
    }
  }

  /**
   * Hide zoom visuals
   * @private
   */
  private hideZoomVisuals(): void {
    try {
      if (this.zoomLinesRef) {
        this.zoomLinesRef.setLineEnabled(0, false);
        this.zoomLinesRef.setLineEnabled(1, false);
      }
      if (this.zoomRegionRef) {
        this.zoomRegionRef.setPolygonEnabled(0, false);
      }
    } catch (error) {
      console.error("ZoomController: Failed to hide zoom visuals:", error);
    }
  }

  /**
   * Clear zoom state and hide all zoom visuals
   * @private
   */
  private clearZoomState(): void {
    this.isZooming = false;
    this.zoomStartX = null;
    this.zoomEndX = null;

    // End panning if active
    this.isPanning = false;
    this.panStartX = null;

    // Hide zoom visuals
    this.hideZoomVisuals();
  }

  /**
   * Update zoom highlight colors based on theme
   * @param isDarkMode Whether dark mode is active
   */
  public updateZoomColors(isDarkMode: boolean): void {
    if (!this.zoomRegionRef) return;

    try {
      // Update polygon color using updatePolygonStyle method
      this.zoomRegionRef.updatePolygonStyle(0, {
        fillColor: this.getZoomColors(isDarkMode),
      });

      // Trigger a redraw to apply the color change immediately
      if (this.onWebglRedrawCb) {
        this.onWebglRedrawCb();
      }
    } catch (error) {
      console.error("ZoomController: Failed to update zoom colors:", error);
    }
  }
}
