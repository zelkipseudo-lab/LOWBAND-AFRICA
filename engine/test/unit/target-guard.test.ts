import { describe, expect, it, vi } from "vitest";
import {
  TargetGuard,
  TargetGuardError,
  isPublicIpAddress,
  type LookupAddress,
} from "../../src/security/target-guard.js";

function guardReturning(addresses: string[], options: { cacheTtlMs?: number } = {}) {
  const resolver = vi.fn(async (): Promise<LookupAddress[]> =>
    addresses.map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    })),
  );
  return { guard: new TargetGuard({ resolver, dnsCacheTtlMs: options.cacheTtlMs ?? 0 }), resolver };
}

async function expectReason(url: string, reason: string, addresses: string[] = ["93.184.216.34"]) {
  const { guard } = guardReturning(addresses);
  await expect(guard.assertUrlAllowed(url)).rejects.toMatchObject({ reason });
}

describe("public IP classification", () => {
  it.each([
    "93.184.216.34",
    "8.8.8.8",
    "2606:2800:220:1:248:1893:25c8:1946",
  ])("accepts public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(true);
  });

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "192.0.2.1",
    "198.18.0.1",
    "::1",
    "fc00::1",
    "fd00:ec2::254",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "2001:db8::1",
    "not-an-ip",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it("accepts an IPv4-mapped public address", () => {
    expect(isPublicIpAddress("::ffff:93.184.216.34")).toBe(true);
  });
});

describe("TargetGuard URL validation", () => {
  it("accepts a public HTTPS URL on port 443", async () => {
    const { guard, resolver } = guardReturning(["93.184.216.34"]);
    const target = await guard.assertUrlAllowed("https://example.com/path?q=1");
    expect(target.hostname).toBe("example.com");
    expect(target.addresses).toEqual(["93.184.216.34"]);
    expect(resolver).toHaveBeenCalledWith("example.com");
  });

  it("accepts explicit ports 80 and 443", async () => {
    const { guard } = guardReturning(["93.184.216.34"]);
    await expect(guard.assertUrlAllowed("http://example.com:80/")).resolves.toBeDefined();
    await expect(guard.assertUrlAllowed("https://example.com:443/")).resolves.toBeDefined();
  });

  it.each([
    ["ftp://example.com/", "UNSUPPORTED_PROTOCOL"],
    ["file:///C:/Windows/win.ini", "UNSUPPORTED_PROTOCOL"],
    ["javascript:alert(1)", "UNSUPPORTED_PROTOCOL"],
    ["not a url", "INVALID_URL"],
    ["https://user:pass@example.com/", "INVALID_URL"],
    ["https://example.com:8080/", "BLOCKED_TARGET"],
    ["http://localhost/", "BLOCKED_TARGET"],
    ["http://localhost.localdomain/", "BLOCKED_TARGET"],
    ["http://app.internal/", "BLOCKED_TARGET"],
    ["http://metadata.google.internal/", "BLOCKED_TARGET"],
    ["http://intranet/", "BLOCKED_TARGET"],
  ])("rejects %s with %s", async (url, reason) => {
    await expectReason(url, reason);
  });

  it.each([
    "http://127.0.0.1/",
    "http://127.0.0.1:443/",
    "http://10.0.0.5/",
    "http://192.168.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://0177.0.0.1/",
  ])("blocks literal or obfuscated local address %s", async (url) => {
    await expectReason(url, "BLOCKED_TARGET");
  });

  it("blocks when any resolved address is private", async () => {
    await expectReason("https://example.com/", "BLOCKED_TARGET", [
      "93.184.216.34",
      "127.0.0.1",
    ]);
  });

  it("accepts a public IPv6 literal", async () => {
    const { guard, resolver } = guardReturning([]);
    const target = await guard.assertUrlAllowed("https://[2606:2800::1]/");
    expect(target.addresses).toEqual(["2606:2800::1"]);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("maps DNS failures to DNS_RESOLUTION_FAILED", async () => {
    const guard = new TargetGuard({
      resolver: async () => {
        throw new Error("ENOTFOUND");
      },
    });
    await expect(guard.assertUrlAllowed("https://missing.invalid/")).rejects.toMatchObject({
      reason: "DNS_RESOLUTION_FAILED",
    });
  });

  it("returns an empty DNS answer as a resolution failure", async () => {
    const { guard } = guardReturning([]);
    await expect(guard.assertUrlAllowed("https://empty.example/")).rejects.toMatchObject({
      reason: "DNS_RESOLUTION_FAILED",
    });
  });

  it("normalizes a trailing dot and caches positive DNS answers", async () => {
    const { guard, resolver } = guardReturning(["93.184.216.34"], { cacheTtlMs: 60_000 });
    await guard.assertUrlAllowed("https://example.com./");
    await guard.assertUrlAllowed("https://example.com/other");
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("exposes a typed TargetGuardError", async () => {
    const { guard } = guardReturning(["127.0.0.1"]);
    await expect(guard.assertUrlAllowed("https://example.com/")).rejects.toBeInstanceOf(
      TargetGuardError,
    );
  });
});
