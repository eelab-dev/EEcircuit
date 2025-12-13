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
 * SIMPLIFIED: Dual Canvas X-Axis Synchronization
 * ==============================================
 * In dual canvas mode, both canvases have identical X-axis scales (enforced by usePlotCalculations.ts
 * validation). This allows direct sharing of X-coordinates in data space without conversion.
 * 
 * Key Benefits:
 * - Eliminates coordinate conversion precision issues
 * - Reduces complexity and potential bugs
 * - Direct data coordinate sharing for zoom and pan operations
 * - Y-axis scales remain independent per canvas (as intended)
 * 
 * Implementation:
 * - notifyZoomStateChange(): Shares data coordinates directly
 * - applyExternalZoomState(): Uses received coordinates directly
 * - Pan synchronization works in data coordinate space
 * - Visual rendering uses canvas-specific axis scales for proper positioning
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
  
  // Reference to plot for getting actual displayed bounds
  private plotRef: { getAllDataBounds?: () => { minX: number; maxX: number; minY: number; maxY: number } | null } | null = null;

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

  // Captured axis scales at zoom start to prevent coordinate drift
  // CRITICAL: These scales are frozen at zoom start to ensure consistent coordinate
  // conversion throughout the entire zoom operation, preventing axis scale updates
  // from corrupting zoom coordinates mid-operation
  private zoomStartAxisScales = {
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
    isDarkMode: boolean = true,
    plotRef?: { getAllDataBounds?: () => { minX: number; maxX: number; minY: number; maxY: number } | null } | null
  ): void {
    this.zoomLinesRef = zoomLines;
    this.zoomRegionRef = zoomRegion;
    this.canvasElement = canvas;
    this.plotRef = plotRef || null;

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
    // No need to reset bounds since we now handle coordinate conversion properly
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
   * Convert mouse position to data coordinates using specific axis scales
   * Used during zoom operations to prevent coordinate drift
   */
  private convertMouseToDataCoordinatesWithScales(
    mouseNdcX: number, 
    mouseNdcY: number, 
    scales: { scaleX: number; scaleY: number; offsetX: number; offsetY: number }
  ): { dataX: number; dataY: number } {
    // Convert NDC to data coordinates using specified axis scales
    const dataX = (mouseNdcX - scales.offsetX) / scales.scaleX;
    const dataY = (mouseNdcY - scales.offsetY) / scales.scaleY;
    
    return { dataX, dataY };
  }

  // Note: convertDataToDisplayCoordinates and convertDisplayToDataCoordinates are now imported from coordinateUtils

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
   * @param min Minimum X value of the original data (always in linear space)
   * @param max Maximum X value of the original data (always in linear space)
   *
   * NOTE: The bounds should always be in linear space, regardless of log axis settings.
   * The ZoomController handles coordinate space conversion internally when comparing
   * with zoom bounds (which may be in log space when isLogX = true).
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
   * 
   * SIMPLIFIED: Direct X-Coordinate Synchronization
   * ============================================== 
   * Since both canvases in dual mode have identical X-axis scales (enforced by usePlotCalculations),
   * we can share X-coordinates directly in data space without complex normalization.
   * This eliminates precision issues and coordinate conversion complexity.
   */
  private notifyZoomStateChange(): void {
    if (this.onZoomStateChangeCb) {
      // Share data coordinates directly - no conversion needed since X-axis scales are identical
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
   * 
   * SIMPLIFIED: Direct Data Coordinate Application
   * ============================================= 
   * Since X-axis scales are identical between canvases, we can use the received
   * data coordinates directly without any conversion.
   */
  applyExternalZoomState(zoomState: {
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  }): void {
    // Capture current axis scales when starting zoom for consistent visual rendering
    if (zoomState.isZooming && !this.isZooming) {
      this.zoomStartAxisScales = { ...this.axisScales };
    }

    this.isZooming = zoomState.isZooming;
    this.customXBounds = zoomState.zoomBounds
      ? { ...zoomState.zoomBounds }
      : null;

    // Use data coordinates directly - no conversion needed since X-axis scales are identical
    this.zoomStartX = zoomState.zoomStartX;
    this.zoomEndX = zoomState.zoomEndX;

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
   * 
   * IMPORTANT: Only X-axis bounds are managed by ZoomController
   * Y-axis bounds are calculated independently by each canvas in usePlotCalculations
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

    // CRITICAL FIX: Capture axis scales at zoom start to prevent coordinate drift
    this.zoomStartAxisScales = { ...this.axisScales };

    const rect = this.canvasElement.getBoundingClientRect();
    // Convert mouse X to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    
    // Convert mouse position to data coordinates using captured scales
    const { dataX } = this.convertMouseToDataCoordinatesWithScales(mouseNdcX, 0, this.zoomStartAxisScales);

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
    
    // CRITICAL: Use the same axis scales as zoom start to prevent coordinate drift
    // This ensures consistent coordinate conversion throughout the zoom operation
    const { dataX } = this.convertMouseToDataCoordinatesWithScales(mouseNdcX, 0, this.zoomStartAxisScales);

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
    

    // Simple bounds limiting: prevent panning when view would go beyond data edges
    if (this.customXBounds && this.originalDataBounds) {
      const currentViewMin = this.customXBounds.min + this.panOffsetX;
      const currentViewMax = this.customXBounds.max + this.panOffsetX;
      const newViewMin = this.customXBounds.min + panDelta;
      const newViewMax = this.customXBounds.max + panDelta;
      
      // Get actual displayed bounds - use webgl-plot's current bounds which handle log space properly
      let dataMin = this.originalDataBounds.min;
      let dataMax = this.originalDataBounds.max;
      
      // If we have plot reference and log axis, get the actual displayed bounds
      if (this.logAxisState.isLogX && this.plotRef && this.plotRef.getAllDataBounds) {
        const currentBounds = this.plotRef.getAllDataBounds();
        if (currentBounds) {
          // In log mode, webgl-plot gives us the bounds in the coordinate space it's actually using
          dataMin = currentBounds.minX;
          dataMax = currentBounds.maxX;
        }
      } else if (this.logAxisState.isLogX) {
        // Fallback: convert original bounds, but only if they're positive
        dataMin = dataMin > 0 ? Math.log10(dataMin) : Math.log10(1e-10);
        dataMax = dataMax > 0 ? Math.log10(dataMax) : Math.log10(1e-10);
      }
      
      // Prevent panning only in the direction that would exceed bounds
      if (newViewMin < dataMin && newViewMin < currentViewMin) {
        // Would go left beyond data bound - clamp to data edge
        panDelta = dataMin - this.customXBounds.min;
      } else if (newViewMax > dataMax && newViewMax > currentViewMax) {
        // Would go right beyond data bound - clamp to data edge  
        panDelta = dataMax - this.customXBounds.max;
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
    
    // Adjust scroll sensitivity based on coordinate space
    let scrollSensitivity: number;
    
    if (this.logAxisState.isLogX) {
      // For log X axis, use a smaller sensitivity since log space units are different
      // In log space, the range represents orders of magnitude, so we need finer control
      scrollSensitivity = zoomRange * 0.005; // 0.5% for log scale (more precise)
    } else {
      // For linear X axis, use normal sensitivity
      scrollSensitivity = zoomRange * 0.01; // 1% for linear scale
    }

    // Calculate new pan offset
    let newPanOffset = this.panOffsetX + deltaX * scrollSensitivity;
    

    // Simple bounds limiting: prevent panning when view would go beyond data edges
    if (this.originalDataBounds && this.customXBounds) {
      const currentViewMin = this.customXBounds.min + this.panOffsetX;
      const currentViewMax = this.customXBounds.max + this.panOffsetX;
      const newViewMin = this.customXBounds.min + newPanOffset;
      const newViewMax = this.customXBounds.max + newPanOffset;
      
      // Get actual displayed bounds - use webgl-plot's current bounds which handle log space properly
      let dataMin = this.originalDataBounds.min;
      let dataMax = this.originalDataBounds.max;
      
      // If we have plot reference and log axis, get the actual displayed bounds
      if (this.logAxisState.isLogX && this.plotRef && this.plotRef.getAllDataBounds) {
        const currentBounds = this.plotRef.getAllDataBounds();
        if (currentBounds) {
          // In log mode, webgl-plot gives us the bounds in the coordinate space it's actually using
          dataMin = currentBounds.minX;
          dataMax = currentBounds.maxX;
        }
      } else if (this.logAxisState.isLogX) {
        // Fallback: convert original bounds, but only if they're positive
        dataMin = dataMin > 0 ? Math.log10(dataMin) : Math.log10(1e-10);
        dataMax = dataMax > 0 ? Math.log10(dataMax) : Math.log10(1e-10);
      }
      
      
      
      // Prevent panning only in the direction that would exceed bounds
      if (newViewMin < dataMin && newViewMin < currentViewMin) {
        // Would go left beyond data bound - clamp to data edge
        newPanOffset = dataMin - this.customXBounds.min;
      } else if (newViewMax > dataMax && newViewMax > currentViewMax) {
        // Would go right beyond data bound - clamp to data edge  
        newPanOffset = dataMax - this.customXBounds.max;
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
      // CRITICAL FIX: During zoom operations, use the captured zoom start axis scales
      // This ensures consistent coordinate conversion between dual canvases
      const useScales = this.isZooming ? this.zoomStartAxisScales : this.axisScales;
      const startNdcX =
        startDataX * useScales.scaleX + useScales.offsetX;
      const endNdcX =
        endDataX * useScales.scaleX + useScales.offsetX;


      // Create vertical lines at start and end positions (full height)
      const startLinePoints = new Float32Array([startNdcX, -1, startNdcX, 1]);
      const endLinePoints = new Float32Array([endNdcX, -1, endNdcX, 1]);

      // Update vertical lines
      this.zoomLinesRef.updateLinePoints(0, startLinePoints);
      this.zoomLinesRef.updateLinePoints(1, endLinePoints);

      // Create yellow semi-transparent region between the lines
      // CRITICAL FIX: Always ensure proper left/right ordering for zoom region
      const leftX = Math.min(startNdcX, endNdcX);
      const rightX = Math.max(startNdcX, endNdcX);

      // Ensure we have a valid region (prevent zero-width or inverted rectangles)
      const regionWidth = rightX - leftX;
      if (regionWidth < 0.001) {
        // For very small selections, show a thin line instead of trying to render invalid rectangle
        this.zoomRegionRef.setPolygonEnabled(0, false);
        return;
      }

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
