/**
 * Normalizes historical v1 schematic details that the stricter v2 editor
 * rejects. The persisted EEcircuit format remains unchanged.
 */
export const normalizeLegacySchematic = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const root = structuredClone(value) as {
    componentInstances?: unknown;
    wires?: unknown;
  };
  const junctionOccurrences = new Set<string>();
  const junctionPositions: Array<{ x: number; y: number }> = [];

  if (Array.isArray(root.wires)) {
    for (const wire of root.wires) {
      if (!wire || typeof wire !== "object") continue;
      const item = wire as {
        startLocation?: unknown;
        endLocation?: unknown;
        absolutePath?: unknown;
      };

      if (Array.isArray(item.absolutePath)) {
        item.absolutePath = item.absolutePath.map((point) => {
          if (!point || typeof point !== "object") return point;
          const p = point as { x?: unknown; y?: unknown };
          return {
            ...p,
            x: typeof p.x === "number" && Math.abs(p.x) < 1e-9 ? 0 : p.x,
            y: typeof p.y === "number" && Math.abs(p.y) < 1e-9 ? 0 : p.y,
          };
        });
      }

      for (const side of ["startLocation", "endLocation"] as const) {
        const location = item[side];
        if (!location || typeof location !== "object") continue;
        const loc = location as {
          type?: unknown;
          prop?: { junctionPosition?: { x?: unknown; y?: unknown } };
        };
        const position = loc.prop?.junctionPosition;
        if (
          loc.type === "junction" &&
          typeof position?.x === "number" &&
          typeof position.y === "number"
        ) {
          const key = `${position.x},${position.y}`;
          if (junctionOccurrences.has(key)) item[side] = undefined;
          else {
            junctionOccurrences.add(key);
            junctionPositions.push({ x: position.x, y: position.y });
          }
        } else if (loc.type === "terminal") {
          item[side] = undefined;
        }
      }
    }

    for (const position of junctionPositions) {
      const hasPassingWire = root.wires.some((wire) => {
        if (!wire || typeof wire !== "object") return false;
        const path = (wire as { absolutePath?: unknown }).absolutePath;
        if (!Array.isArray(path)) return false;
        for (let index = 1; index < path.length; index += 1) {
          const start = path[index - 1] as { x?: unknown; y?: unknown };
          const end = path[index] as { x?: unknown; y?: unknown };
          if (
            start.x === end.x &&
            start.x === position.x &&
            typeof start.y === "number" &&
            typeof end.y === "number" &&
            position.y > Math.min(start.y, end.y) &&
            position.y < Math.max(start.y, end.y)
          ) return true;
          if (
            start.y === end.y &&
            start.y === position.y &&
            typeof start.x === "number" &&
            typeof end.x === "number" &&
            position.x > Math.min(start.x, end.x) &&
            position.x < Math.max(start.x, end.x)
          ) return true;
        }
        return false;
      });
      if (!hasPassingWire) {
        root.wires.push({
          absolutePath: [
            { x: position.x - 1, y: position.y },
            { x: position.x + 1, y: position.y },
          ],
        });
      }
    }
  }

  return root;
};
