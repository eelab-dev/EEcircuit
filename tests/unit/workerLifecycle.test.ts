import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanupPersistentWorkers,
  getWorkerPoolStatus,
  prewarmSimulationEngine,
  runParallelSimulation,
  runSimulationInWorker,
  runSingleSimulation,
} from "../../src/simulation/parallelSimulation";

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

class WarmWorker extends FakeWorker {
  static instances: WarmWorker[] = [];
  static failedInitializations = 0;
  static deferInitialization = false;
  static pendingInitializations: Array<() => void> = [];

  constructor() {
    super();
    WarmWorker.instances.push(this);
  }

  override postMessage(message: unknown): void {
    this.posts.push(message);
    const payload = message as {
      type?: string;
      netlist?: string;
      sessionId?: string;
      requestId?: string;
    };

    if (payload.type === "initialize") {
      const respond = () => {
        const success = WarmWorker.failedInitializations === 0;
        if (!success) WarmWorker.failedInitializations -= 1;
        this.emit("message", {
          data: {
            type: "initialized",
            requestId: payload.requestId,
            success,
            errorMessage: success ? undefined : "engine startup failed",
          },
        });
      };
      if (WarmWorker.deferInitialization) WarmWorker.pendingInitializations.push(respond);
      else queueMicrotask(respond);
      return;
    }

    if (payload.type === "run") {
      queueMicrotask(() => this.emit("message", {
        data: {
          type: "result",
          sessionId: payload.sessionId,
          requestId: payload.requestId,
          success: true,
        },
      }));
    }
  }

  static reset(): void {
    WarmWorker.instances = [];
    WarmWorker.failedInitializations = 0;
    WarmWorker.deferInitialization = false;
    WarmWorker.pendingInitializations = [];
  }
}

afterEach(() => {
  cleanupPersistentWorkers();
  WarmWorker.reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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
    vi.stubGlobal("navigator", { hardwareConcurrency: 1 });
    vi.stubGlobal("Worker", FakeWorker);
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
  });
});

describe("simulation engine background warmup", () => {
  it("shares one initialization handshake across duplicate preload calls", async () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 2 });
    vi.stubGlobal("Worker", WarmWorker);

    const first = prewarmSimulationEngine();
    const second = prewarmSimulationEngine();
    expect(second).toBe(first);
    await Promise.all([first, second]);

    expect(WarmWorker.instances).toHaveLength(1);
    const worker = WarmWorker.instances[0]!;
    expect(worker.posts).toHaveLength(1);
    expect(worker.posts[0]).toMatchObject({ type: "initialize" });
    expect(getWorkerPoolStatus()).toEqual({
      initialized: true,
      totalWorkers: 1,
      availableWorkers: 1,
      busyWorkers: 0,
      readyWorkers: 1,
    });
  });

  it("makes a concurrent run wait for the in-flight warmup", async () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 1 });
    vi.stubGlobal("Worker", WarmWorker);
    WarmWorker.deferInitialization = true;

    const warmup = prewarmSimulationEngine();
    const run = runSingleSimulation("V1 in 0 1");
    await vi.waitFor(() => expect(WarmWorker.instances[0]?.posts).toHaveLength(1));
    const worker = WarmWorker.instances[0]!;
    expect(worker.posts[0]).toMatchObject({ type: "initialize" });

    WarmWorker.pendingInitializations.shift()?.();
    await expect(warmup).resolves.toBeUndefined();
    await expect(run).resolves.toMatchObject({ success: true });
    expect(worker.posts).toHaveLength(2);
    expect(worker.posts[1]).toMatchObject({ type: "run" });
  });

  it("retries with a replacement worker after background initialization fails", async () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 1 });
    vi.stubGlobal("Worker", WarmWorker);
    WarmWorker.failedInitializations = 1;

    await expect(prewarmSimulationEngine()).rejects.toThrow("engine startup failed");
    await expect(prewarmSimulationEngine()).resolves.toBeUndefined();

    expect(WarmWorker.instances).toHaveLength(2);
    expect(WarmWorker.instances[0]!.terminated).toBe(true);
    expect(getWorkerPoolStatus().readyWorkers).toBe(1);
  });

  it("preserves the warmed worker when a bracket sweep expands the pool", async () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 2 });
    vi.stubGlobal("Worker", WarmWorker);
    await prewarmSimulationEngine();
    const warmedWorker = WarmWorker.instances[0]!;

    await expect(runParallelSimulation("R1 1 0 [1:1:2]k", { maxWorkers: 2 }))
      .resolves.toMatchObject({ success: true, successfulSimulations: 2 });

    expect(WarmWorker.instances).toHaveLength(2);
    expect(warmedWorker.terminated).toBe(false);
    expect(getWorkerPoolStatus()).toMatchObject({ totalWorkers: 2, readyWorkers: 1 });
  });
});
