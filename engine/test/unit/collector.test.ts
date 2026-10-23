import { describe, expect, it } from "vitest";
import { NetworkCollector, categoryForResourceType } from "../../src/network/collector.js";

type Handler = (event: unknown) => void;

function fakeSession() {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    session: {
      send: async () => undefined,
      on: (name: string, handler: Handler) => {
        handlers.set(name, handler);
      },
    },
  };
}

function emit(
  handlers: Map<string, Handler>,
  event: string,
  payload: Record<string, unknown>,
): void {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`No handler for ${event}`);
  handler(payload);
}

describe("resource categories", () => {
  it.each([
    ["Script", "javascriptBytes"],
    ["Stylesheet", "cssBytes"],
    ["Image", "imageBytes"],
    ["Font", "fontBytes"],
    ["Document", "otherBytes"],
    ["XHR", "otherBytes"],
    ["Fetch", "otherBytes"],
    ["Media", "otherBytes"],
    ["WebSocket", "otherBytes"],
  ] as const)("maps %s to %s", (type, category) => {
    expect(categoryForResourceType(type)).toBe(category);
  });
});

describe("NetworkCollector aggregation", () => {
  it("returns nulls when no response finished", async () => {
    const { handlers, session } = fakeSession();
    const collector = new NetworkCollector(session as never);
    await collector.start();

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "1",
      request: { url: "https://example.com/" },
      type: "Document",
    });

    const snapshot = collector.snapshot();
    expect(snapshot.requestCount).toBe(1);
    expect(snapshot.transferBytes).toBeNull();
    expect(snapshot.resources.imageBytes).toBeNull();
    expect(snapshot.incompleteResponses).toBe(1);
  });

  it("sums observed encoded bytes and categorizes completed responses", async () => {
    const { handlers, session } = fakeSession();
    const collector = new NetworkCollector(session as never);
    await collector.start();

    const requests = [
      { id: "doc", type: "Document", bytes: 1000 },
      { id: "js", type: "Script", bytes: 500 },
      { id: "css", type: "Stylesheet", bytes: 200 },
      { id: "img", type: "Image", bytes: 3000 },
      { id: "font", type: "Font", bytes: 700 },
    ];

    for (const request of requests) {
      emit(handlers, "Network.requestWillBeSent", {
        requestId: request.id,
        request: { url: `https://example.com/${request.id}` },
        type: request.type,
      });
      emit(handlers, "Network.responseReceived", {
        requestId: request.id,
        type: request.type,
        response: { status: 200, encodedDataLength: 0 },
      });
      emit(handlers, "Network.loadingFinished", {
        requestId: request.id,
        encodedDataLength: request.bytes,
      });
    }

    const snapshot = collector.snapshot();
    expect(snapshot.requestCount).toBe(5);
    expect(snapshot.transferBytes).toBe(5400);
    expect(snapshot.resources).toEqual({
      javascriptBytes: 500,
      cssBytes: 200,
      imageBytes: 3000,
      fontBytes: 700,
      otherBytes: 1000,
    });
    expect(snapshot.failedRequests).toBe(0);
  });

  it("counts network failures and HTTP errors without double counting", async () => {
    const { handlers, session } = fakeSession();
    const collector = new NetworkCollector(session as never);
    await collector.start();

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "failed",
      request: { url: "https://example.com/fail" },
      type: "XHR",
    });
    emit(handlers, "Network.loadingFailed", { requestId: "failed", errorText: "net::ERR_FAILED" });

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "404",
      request: { url: "https://example.com/missing" },
      type: "Image",
    });
    emit(handlers, "Network.responseReceived", {
      requestId: "404",
      type: "Image",
      response: { status: 404 },
    });
    emit(handlers, "Network.loadingFinished", { requestId: "404", encodedDataLength: 120 });

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "ok",
      request: { url: "https://example.com/ok" },
      type: "Document",
    });
    emit(handlers, "Network.responseReceived", {
      requestId: "ok",
      type: "Document",
      response: { status: 200 },
    });
    emit(handlers, "Network.loadingFinished", { requestId: "ok", encodedDataLength: 800 });

    const snapshot = collector.snapshot();
    expect(snapshot.requestCount).toBe(3);
    expect(snapshot.failedRequests).toBe(2);
    expect(snapshot.transferBytes).toBe(920);
  });

  it("counts a redirect chain once because CDP reuses the requestId", async () => {
    const { handlers, session } = fakeSession();
    const collector = new NetworkCollector(session as never);
    await collector.start();

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "1",
      request: { url: "http://example.com/" },
      type: "Document",
    });
    emit(handlers, "Network.requestWillBeSent", {
      requestId: "1",
      request: { url: "https://example.com/" },
      type: "Document",
      redirectResponse: { status: 301 },
    });
    emit(handlers, "Network.responseReceived", {
      requestId: "1",
      type: "Document",
      response: { status: 200 },
    });
    emit(handlers, "Network.loadingFinished", { requestId: "1", encodedDataLength: 1000 });

    const snapshot = collector.snapshot();
    expect(snapshot.requestCount).toBe(1);
    expect(snapshot.failedRequests).toBe(0);
    expect(snapshot.transferBytes).toBe(1000);
  });

  it("reports cache and service-worker responses", async () => {
    const { handlers, session } = fakeSession();
    const collector = new NetworkCollector(session as never);
    await collector.start();

    emit(handlers, "Network.requestWillBeSent", {
      requestId: "sw",
      request: { url: "https://example.com/app.js" },
      type: "Script",
    });
    emit(handlers, "Network.responseReceived", {
      requestId: "sw",
      type: "Script",
      response: { status: 200, fromServiceWorker: true, fromDiskCache: true },
    });
    emit(handlers, "Network.loadingFinished", { requestId: "sw", encodedDataLength: 0 });

    const snapshot = collector.snapshot();
    expect(snapshot.fromServiceWorker).toBe(1);
    expect(snapshot.fromDiskCache).toBe(1);
    expect(snapshot.transferBytes).toBe(0);
  });
});
