import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

export type TargetGuardReason =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "BLOCKED_TARGET"
  | "DNS_RESOLUTION_FAILED";

export class TargetGuardError extends Error {
  readonly reason: TargetGuardReason;

  constructor(reason: TargetGuardReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TargetGuardError";
    this.reason = reason;
  }
}

export interface LookupAddress {
  address: string;
  family: number;
}

export interface TargetGuardOptions {
  allowedPorts?: readonly number[];
  dnsCacheTtlMs?: number;
  resolver?: (hostname: string) => Promise<LookupAddress[]>;
}

export interface ValidatedTarget {
  url: string;
  hostname: string;
  addresses: string[];
}

const DEFAULT_ALLOWED_PORTS = [80, 443];
const DEFAULT_DNS_CACHE_TTL_MS = 5_000;

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".localdomain",
  ".local",
  ".internal",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
  ".private",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function stripBrackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

export function isPublicIpAddress(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }

  if (parsed.kind() === "ipv6") {
    const ipv6 = parsed as ipaddr.IPv6;
    const range = ipv6.range();
    if (range === "ipv4Mapped") {
      return isPublicIpAddress(ipv6.toIPv4Address().toString());
    }
    return range === "unicast";
  }

  const ipv4 = parsed as ipaddr.IPv4;
  return ipv4.range() === "unicast";
}

function normalizeHostname(hostname: string): string {
  return stripBrackets(hostname).replace(/\.$/, "").toLowerCase();
}

function assertHostnameShape(hostname: string): void {
  if (hostname.length === 0) {
    throw new TargetGuardError("INVALID_URL", "Hostname is empty");
  }
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new TargetGuardError("BLOCKED_TARGET", "Local or metadata hostname");
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new TargetGuardError("BLOCKED_TARGET", "Local hostname");
    }
  }
  if (isIP(hostname) === 0 && !hostname.includes(".")) {
    throw new TargetGuardError("BLOCKED_TARGET", "Single-label hostname");
  }
}

export class TargetGuard {
  private readonly allowedPorts: Set<number>;
  private readonly dnsCacheTtlMs: number;
  private readonly resolver: (hostname: string) => Promise<LookupAddress[]>;
  private readonly dnsCache = new Map<string, { addresses: string[]; expiresAt: number }>();

  constructor(options: TargetGuardOptions = {}) {
    this.allowedPorts = new Set(options.allowedPorts ?? DEFAULT_ALLOWED_PORTS);
    this.dnsCacheTtlMs = options.dnsCacheTtlMs ?? DEFAULT_DNS_CACHE_TTL_MS;
    this.resolver =
      options.resolver ??
      ((hostname) =>
        lookup(hostname, { all: true, verbatim: true }).then((rows) =>
          rows.map((row) => ({ address: row.address, family: row.family })),
        ));
  }

  async assertUrlAllowed(rawUrl: string): Promise<ValidatedTarget> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new TargetGuardError("INVALID_URL", "Malformed URL");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new TargetGuardError("UNSUPPORTED_PROTOCOL", "Only HTTP(S) is allowed");
    }
    if (url.username !== "" || url.password !== "") {
      throw new TargetGuardError("INVALID_URL", "URL credentials are not allowed");
    }

    const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
    if (!this.allowedPorts.has(port)) {
      throw new TargetGuardError("BLOCKED_TARGET", "Port is not allowed");
    }

    const hostname = normalizeHostname(url.hostname);
    assertHostnameShape(hostname);

    const literalFamily = isIP(hostname);
    if (literalFamily !== 0) {
      if (!isPublicIpAddress(hostname)) {
        throw new TargetGuardError("BLOCKED_TARGET", "Non-public IP address");
      }
      return { url: url.toString(), hostname, addresses: [hostname] };
    }

    const addresses = await this.resolveHostname(hostname);
    if (addresses.length === 0) {
      throw new TargetGuardError("DNS_RESOLUTION_FAILED", "No DNS address");
    }
    for (const address of addresses) {
      if (!isPublicIpAddress(address)) {
        throw new TargetGuardError("BLOCKED_TARGET", "Hostname resolves to a non-public address");
      }
    }

    return { url: url.toString(), hostname, addresses };
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    const cached = this.dnsCache.get(hostname);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.addresses;
    }

    let rows: LookupAddress[];
    try {
      rows = await this.resolver(hostname);
    } catch (error) {
      throw new TargetGuardError("DNS_RESOLUTION_FAILED", "DNS resolution failed", {
        cause: error,
      });
    }

    const addresses = rows.map((row) => row.address);
    if (this.dnsCacheTtlMs > 0) {
      this.dnsCache.set(hostname, {
        addresses,
        expiresAt: now + this.dnsCacheTtlMs,
      });
    }
    return addresses;
  }
}

export function createTargetGuard(options?: TargetGuardOptions): TargetGuard {
  return new TargetGuard(options);
}
