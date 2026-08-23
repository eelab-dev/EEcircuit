import { describe, expect, it } from "vitest";
import { ZoomController } from "../../src/components/ScientificPlot/plotcanvas/interactions/zoomController";

describe("ZoomController result bounds", () => {
  it("clamps a preserved viewport while retaining its span", () => {
    const controller = new ZoomController();
    controller.setZoomBounds(40, 60);
    controller.setOriginalDataBounds(0, 100);
    controller.setOriginalDataBounds(0, 50);
    expect(controller.getZoomBounds()).toEqual({ min: 30, max: 50 });
    expect(controller.getPanOffset()).toBe(0);
  });

  it("resets an invalid or non-overlapping viewport", () => {
    const controller = new ZoomController();
    controller.setZoomBounds(40, 60);
    controller.setOriginalDataBounds(0, 30);
    expect(controller.getZoomBounds()).toBeNull();
    expect(controller.getOriginalDataBounds()).toEqual({ min: 0, max: 30 });
  });
});
