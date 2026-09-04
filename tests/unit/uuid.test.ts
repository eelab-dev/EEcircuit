import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuid } from "../../src/utils/uuid";

describe("createUuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the browser's native UUID implementation when available", () => {
    const randomUUID = vi.fn(() => "123e4567-e89b-42d3-a456-426614174000" as `${string}-${string}-${string}-${string}-${string}`);
    vi.stubGlobal("crypto", { randomUUID, getRandomValues: vi.fn() });
    expect(createUuid()).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("creates a valid version 4 UUID from getRandomValues on insecure origins", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        return bytes;
      },
    });
    expect(createUuid()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });
});
