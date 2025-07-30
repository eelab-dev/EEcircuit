import type { WebglLinePlot, WebglPolygonPlot } from "webgl-plot";

/**
 * Zoom controller for WebGL plot canvas
 * Handles zoom state and operations independent of React lifecycle
 */
export class ZoomController {
  private isZooming = false;
  private zoomStartX: number | null = null;
  private zoomEndX: number | null = null;
  private customXBounds: { min: number; max: number } | null = null;

  // Panning state for horizontal movement when zoomed
  private isPanning = false;
  private panStartX: number | null = null;
  private panOffsetX = 0; // Current accumulated pan offset in data coordinates

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

  /**
   * Initialize zoom controller with WebGL components
   * @param zoomLines WebGL line plotter for zoom indicator lines
   * @param zoomRegion WebGL polygon plotter for zoom region highlight
   * @param canvas HTML canvas element for coordinate calculations
   */
  initialize(
    zoomLines: WebglLinePlot,
    zoomRegion: WebglPolygonPlot,
    canvas: HTMLCanvasElement
  ): void {
    this.zoomLinesRef = zoomLines;
    this.zoomRegionRef = zoomRegion;
    this.canvasElement = canvas;

    // Initialize zoom visual components (disabled by default)
    this.initializeZoomVisuals();

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
    // Convert NDC to data coordinates using current axis scales
    const dataX =
      (mouseNdcX - this.axisScales.offsetX) / this.axisScales.scaleX;

    this.isZooming = true;
    this.zoomStartX = dataX;
    this.zoomEndX = dataX;

    console.log(
      "ZoomController: Started zoom at data X:",
      dataX,
      "NDC X:",
      mouseNdcX
    );

    // Immediately show zoom visuals at start position
    this.showZoomVisuals(dataX, dataX);
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
    // Convert NDC to data coordinates using current axis scales
    const dataX =
      (mouseNdcX - this.axisScales.offsetX) / this.axisScales.scaleX;

    this.zoomEndX = dataX;

    // Update zoom visual feedback
    this.showZoomVisuals(this.zoomStartX, dataX);
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
      appliedBounds = { min: minX, max: maxX };
      console.log("ZoomController: Applied zoom bounds:", appliedBounds);
    }

    // Clear zoom state and hide visuals
    this.clearZoomState();

    return appliedBounds;
  }

  /**
   * Cancel current zoom operation without applying
   */
  cancelZoom(): void {
    if (!this.isZooming) return;

    console.log("ZoomController: Cancelled zoom operation");
    this.clearZoomState();
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
    // Convert NDC to data coordinates using current axis scales
    const dataX =
      (mouseNdcX - this.axisScales.offsetX) / this.axisScales.scaleX;

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
    // Convert NDC to data coordinates using current axis scales
    const currentDataX =
      (mouseNdcX - this.axisScales.offsetX) / this.axisScales.scaleX;

    // Calculate pan delta (negative because dragging right should move view left)
    const panDelta = -(currentDataX - this.panStartX);
    this.panOffsetX = panDelta;
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
    // Very slow scroll sensitivity - 0.1% of current view range per scroll unit
    const scrollSensitivity = zoomRange * 0.01; // Further reduced from 0.005 to 0.001 (5x slower)

    // Apply scroll delta to pan offset
    // Positive deltaX should pan right (positive offset)
    this.panOffsetX += deltaX * scrollSensitivity;
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
   * Initialize zoom visual components with default configurations
   * @private
   */
  private initializeZoomVisuals(): void {
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
          fillColor: [1, 1, 0, 0.2], // Semi-transparent yellow
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
}
