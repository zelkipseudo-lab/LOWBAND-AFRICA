import type { CDPSession } from "playwright";
import type { ResourceBreakdown } from "../types.js";

interface NetworkRequestEntry {
  requestId: string;
  url: string;
  resourceType: string;
  status: number | null;
  failed: boolean;
  finished: boolean;
  transferBytes: number | null;
  fromDiskCache: boolean;
  fromServiceWorker: boolean;
}

export interface NetworkAggregate {
  requestCount: number;
  failedRequests: number;
  transferBytes: number | null;
  resources: ResourceBreakdown;
  incompleteResponses: number;
  fromDiskCache: number;
  fromServiceWorker: number;
}

interface RequestWillBeSentEvent {
  requestId: string;
  request: { url: string };
  type?: string;
  redirectResponse?: { status: number; fromDiskCache?: boolean; fromServiceWorker?: boolean };
}

interface ResponseReceivedEvent {
  requestId: string;
  type?: string;
  response: {
    status: number;
    fromDiskCache?: boolean;
    fromServiceWorker?: boolean;
    encodedDataLength?: number;
  };
}

interface LoadingFinishedEvent {
  requestId: string;
  encodedDataLength: number;
}

interface LoadingFailedEvent {
  requestId: string;
  errorText?: string;
  canceled?: boolean;
  blockedReason?: string;
}

export class NetworkCollector {
  private readonly requests = new Map<string, NetworkRequestEntry>();

  constructor(private readonly session: CDPSession) {}

  async start(): Promise<void> {
    await this.session.send("Network.enable");
    this.session.on("Network.requestWillBeSent", (event: RequestWillBeSentEvent) => {
      const existing = this.requests.get(event.requestId);
      if (existing) {
        existing.url = event.request.url;
        if (event.type) existing.resourceType = event.type;
        return;
      }
      this.requests.set(event.requestId, {
        requestId: event.requestId,
        url: event.request.url,
        resourceType: event.type ?? "Other",
        status: null,
        failed: false,
        finished: false,
        transferBytes: null,
        fromDiskCache: false,
        fromServiceWorker: false,
      });
    });

    this.session.on("Network.responseReceived", (event: ResponseReceivedEvent) => {
      const entry = this.requests.get(event.requestId);
      if (!entry) return;
      if (event.type) entry.resourceType = event.type;
      entry.status = event.response.status;
      entry.fromDiskCache = event.response.fromDiskCache === true;
      entry.fromServiceWorker = event.response.fromServiceWorker === true;
    });

    this.session.on("Network.loadingFinished", (event: LoadingFinishedEvent) => {
      const entry = this.requests.get(event.requestId);
      if (!entry) return;
      entry.finished = true;
      entry.transferBytes = Number.isFinite(event.encodedDataLength)
        ? Math.max(0, event.encodedDataLength)
        : null;
    });

    this.session.on("Network.loadingFailed", (event: LoadingFailedEvent) => {
      const entry = this.requests.get(event.requestId);
      if (!entry) return;
      entry.failed = true;
    });
  }

  snapshot(): NetworkAggregate {
    const resources: ResourceBreakdown = {
      javascriptBytes: 0,
      cssBytes: 0,
      imageBytes: 0,
      fontBytes: 0,
      otherBytes: 0,
    };
    let finishedCount = 0;
    let transferBytes = 0;
    let failedRequests = 0;
    let incompleteResponses = 0;
    let fromDiskCache = 0;
    let fromServiceWorker = 0;

    for (const entry of this.requests.values()) {
      const httpError = entry.status !== null && entry.status >= 400;
      if (entry.failed || httpError) failedRequests += 1;
      if (!entry.finished && !entry.failed) incompleteResponses += 1;
      if (entry.fromDiskCache) fromDiskCache += 1;
      if (entry.fromServiceWorker) fromServiceWorker += 1;

      if (entry.finished && entry.transferBytes !== null) {
        finishedCount += 1;
        transferBytes += entry.transferBytes;
        const category = categoryForResourceType(entry.resourceType);
        resources[category] = (resources[category] ?? 0) + entry.transferBytes;
      }
    }

    return {
      requestCount: this.requests.size,
      failedRequests,
      transferBytes: finishedCount > 0 ? transferBytes : null,
      resources: finishedCount > 0 ? resources : emptyResourceBreakdown(),
      incompleteResponses,
      fromDiskCache,
      fromServiceWorker,
    };
  }

  get requestCount(): number {
    return this.requests.size;
  }
}

export function emptyResourceBreakdown(): ResourceBreakdown {
  return {
    javascriptBytes: null,
    cssBytes: null,
    imageBytes: null,
    fontBytes: null,
    otherBytes: null,
  };
}

export function categoryForResourceType(resourceType: string): keyof ResourceBreakdown {
  switch (resourceType) {
    case "Script":
      return "javascriptBytes";
    case "Stylesheet":
      return "cssBytes";
    case "Image":
      return "imageBytes";
    case "Font":
      return "fontBytes";
    default:
      return "otherBytes";
  }
}
