import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { metalsSource } from "../dist/sources/metals.js";

const GOLD = metalsSource.instruments.find((i) => i.key === "gold")!;

// Stooq returns CSV rows in oldest-first order
const SAMPLE_CSV = `Date,Open,High,Low,Close,Volume
2026-04-12,2310.5,2340.0,2305.0,2330.0,0
2026-04-13,2330.0,2360.0,2325.0,2350.1,0
2026-04-14,2350.1,2375.0,2340.5,2368.2,0`;

describe("metalsSource.fetch", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed data points from CSV, newest first", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      text: async () => SAMPLE_CSV,
    })) as typeof fetch;

    const result = await metalsSource.fetch(GOLD, {});
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0], { period: "2026-04-14", value: 2368.2 });
    assert.deepStrictEqual(result[1], { period: "2026-04-13", value: 2350.1 });
    assert.deepStrictEqual(result[2], { period: "2026-04-12", value: 2330.0 });
  });

  it("respects the length option", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      text: async () => SAMPLE_CSV,
    })) as typeof fetch;

    const result = await metalsSource.fetch(GOLD, {}, { length: 2 });
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].period, "2026-04-14");
    assert.strictEqual(result[1].period, "2026-04-13");
  });

  it("constructs correct URL with ticker", async () => {
    let capturedUrl = "";
    globalThis.fetch = (async (url: URL) => {
      capturedUrl = url.toString();
      return {
        ok: true,
        text: async () => "Date,Open,High,Low,Close,Volume\n",
      };
    }) as typeof fetch;

    await metalsSource.fetch(GOLD, {});

    assert.ok(capturedUrl.includes("s=xauusd"));
    assert.ok(capturedUrl.includes("i=d"));
  });

  it("throws on non-200 response", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    })) as typeof fetch;

    await assert.rejects(() => metalsSource.fetch(GOLD, {}), {
      message: /HTTP 500/,
    });
  });

  it("returns empty array for empty CSV body", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      text: async () => "Date,Open,High,Low,Close,Volume\n",
    })) as typeof fetch;

    const result = await metalsSource.fetch(GOLD, {});
    assert.strictEqual(result.length, 0);
  });

  it("uses d1 and d2 params when from/to are provided", async () => {
    let capturedUrl = "";
    globalThis.fetch = (async (url: URL) => {
      capturedUrl = url.toString();
      return {
        ok: true,
        text: async () => SAMPLE_CSV,
      };
    }) as typeof fetch;

    await metalsSource.fetch(GOLD, {}, {
      from: "2025-01-01",
      to: "2025-06-30",
    });

    assert.ok(capturedUrl.includes("d1=20250101"), "should have d1 param");
    assert.ok(capturedUrl.includes("d2=20250630"), "should have d2 param");
  });

  it("returns all data when from/to are set (no length slicing)", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      text: async () => SAMPLE_CSV,
    })) as typeof fetch;

    const result = await metalsSource.fetch(GOLD, {}, {
      from: "2026-04-12",
      to: "2026-04-14",
    });
    assert.strictEqual(result.length, 3, "should return all 3 rows, not sliced");
  });
});

describe("metalsSource metadata", () => {
  it("has expected instruments", () => {
    const keys = metalsSource.instruments.map((i) => i.key);
    assert.deepStrictEqual(keys, ["gold", "silver", "platinum", "palladium"]);
  });

  it("does not require an API key", () => {
    assert.strictEqual(metalsSource.envVar, undefined);
  });
});
