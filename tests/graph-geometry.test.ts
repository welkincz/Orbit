import { describe, expect, it } from "vitest";
import {
  didPointerDrag,
  getGraphPointerTarget,
  isPrimaryPointerActivation,
  type ScreenGraphLink,
  type ScreenGraphNode,
} from "@/lib/graph-geometry";

const maya: ScreenGraphNode = {
  personId: "maya",
  x: 100,
  y: 80,
  radius: 8,
  labelWidth: 64,
};

const theo: ScreenGraphNode = {
  personId: "theo",
  x: 240,
  y: 80,
  radius: 6,
  labelWidth: 68,
};

const relationship: ScreenGraphLink = {
  id: "direct:maya:theo",
  source: { x: maya.x, y: maya.y },
  target: { x: theo.x, y: theo.y },
  width: 1.61,
};

describe("graph pointer geometry", () => {
  it("selects a node from its visible body or full-name label", () => {
    expect(getGraphPointerTarget({ x: 105, y: 83 }, [maya, theo], [relationship])).toEqual({
      kind: "node",
      personId: "maya",
    });
    expect(getGraphPointerTarget({ x: 152, y: 80 }, [maya, theo], [relationship])).toEqual({
      kind: "node",
      personId: "maya",
    });
  });

  it("distinguishes a visible link from genuine blank canvas", () => {
    expect(getGraphPointerTarget({ x: 195, y: 82 }, [maya, theo], [relationship])).toEqual({
      kind: "link",
      linkId: relationship.id,
    });
    expect(getGraphPointerTarget({ x: 180, y: 130 }, [maya, theo], [relationship])).toEqual({
      kind: "background",
    });
  });

  it("uses CSS-pixel geometry without device-pixel rounding", () => {
    const fractionalNode = { ...maya, x: 100.5, y: 80.25 };

    expect(getGraphPointerTarget({ x: 100.5, y: 80.25 }, [fractionalNode], [])).toEqual({
      kind: "node",
      personId: "maya",
    });
  });

  it("accepts only the primary pointer and primary button for activation", () => {
    expect(isPrimaryPointerActivation({ button: 0, isPrimary: true })).toBe(true);
    expect(isPrimaryPointerActivation({ button: 2, isPrimary: true })).toBe(false);
    expect(isPrimaryPointerActivation({ button: 0, isPrimary: false })).toBe(false);
  });

  it("separates a click from a pan using the movement threshold", () => {
    expect(didPointerDrag({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false);
    expect(didPointerDrag({ x: 10, y: 10 }, { x: 15, y: 10 })).toBe(true);
  });
});
