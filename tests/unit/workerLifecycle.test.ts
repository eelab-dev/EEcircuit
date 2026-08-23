import { afterEach, describe, expect, it, vi } from "vitest";
import { runParallelSimulation, runSimulationInWorker, cleanupPersistentWorkers } from "../../src/simulation/parallelSimulation";

class FakeWorker {
  readonly posts: unknown[] = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(message: unknown): void {
    this.posts.push(message);
    const payload = message as { netlist?: string; sessionId?: string; requestId?: string };
    if (payload.netlist?.includes("3k") || payload.netlist?.includes("4k")) {
      queueMicrotask(() => this.emit("message", {
        data: { sessionId: payload.sessionId, requestId: payload.requestId, success: true },
      }));
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(type: string, event: unknown): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

afterEach(() => vi.useRealTimers());

describe("worker request lifecycle", () => {
  it("ignores stale session and request responses", async () => {
    const worker = new FakeWorker();
    const promise = runSimulationInWorker(
      worker as unknown as Worker,
      "V1 in 0 1",
      "1",
      0,
      1000,
      "session-current",
      "request-current",
    );
    worker.emit("message", { data: { sessionId: "old", requestId: "request-current", success: true } });
    worker.emit("message", { data: { sessionId: "session-current", requestId: "old", success: true } });
    worker.emit("message", { data: { sessionId: "session-current", requestId: "request-current", success: true } });
    await expect(promise).resolves.toMatchObject({ success: true, parameterIndex: 0 });
  });

  it("resolves cancellation and stops listening for late worker responses", async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const promise = runSimulationInWorker(
      worker as unknown as Worker,
      "V1 in 0 1",
      "1",
      0,
      1000,
      "session",
      "request",
      controller.signal,
    );
    controller.abort();
    await expect(promise).resolves.toMatchObject({ cancelled: true, success: false });
    worker.emit("message", { data: { sessionId: "session", requestId: "request", success: true } });
  });

  it("returns a timeout result deterministically", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    const promise = runSimulationInWorker(worker as unknown as Worker, "V1", "1", 0, 50, "session", "request");
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toMatchObject({ timedOut: true, success: false });
  });

  it("supersedes an active session and suppresses its callbacks", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: FakeWorker,
    });
    const firstProgress: number[] = [];
    const first = runParallelSimulation("R1 1 0 [1:1:2]k", {
      maxWorkers: 1,
      timeout: 1000,
      onProgress: (completed) => firstProgress.push(completed),
    });
    const second = runParallelSimulation("R1 1 0 [3:1:4]k", { maxWorkers: 1, timeout: 1000 });
    await expect(first).resolves.toMatchObject({ errorMessage: "Simulation superseded or cancelled" });
    await expect(second).resolves.toMatchObject({ success: true, successfulSimulations: 2 });
    expect(firstProgress).toEqual([]);
    cleanupPersistentWorkers();
  });
});
