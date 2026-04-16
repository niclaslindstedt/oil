import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { eiaSource, type EiaInstrument } from "../dist/sources/eia.js";

const BRENT: EiaInstrument = {
  key: "brent",
  label: "Brent Crude",
  unit: "USD/bbl",
  route: "petroleum/pri/spt/data",
  facet: "RBRTE",
};

describe("eiaSource.fetch", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed data points on success", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({
        response: {
          data: [
            { period: "2026-04-14", value: 72.35 },
            { period: "2026-04-13", value: 71.9 },
          ],
        },
      }),
    })) as typeof fetch;

    const result = await eiaSource.fetch(BRENT, { apiKey: "test-key" });
    assert.deepStrictEqual(result, [
      { period: "2026-04-14", value: 72.35 },
      { period: "2026-04-13", value: 71.9 },
    ]);
  });

  it("throws on non-200 response", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    })) as typeof fetch;

    await assert.rejects(() => eiaSource.fetch(BRENT, { apiKey: "bad-key" }), {
      message: /HTTP 403/,
    });
  });

  it("throws on unexpected response format", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ response: {} }),
    })) as typeof fetch;

    await assert.rejects(() => eiaSource.fetch(BRENT, { apiKey: "test-key" }), {
      message: /unexpected format/i,
    });
  });

  it("constructs correct URL with parameters", async () => {
    let capturedUrl = "";
    globalThis.fetch = (async (url: URL) => {
      capturedUrl = url.toString();
      return {
        ok: true,
        json: async () => ({ response: { data: [] } }),
      };
    }) as typeof fetch;

    await eiaSource.fetch(BRENT, { apiKey: "my-key" }, { length: 10 });

    assert.ok(capturedUrl.includes("api_key=my-key"));
    assert.ok(capturedUrl.includes("petroleum/pri/spt/data"));
    assert.ok(capturedUrl.includes("RBRTE"));
    assert.ok(capturedUrl.includes("length=10"));
  });

  it("throws when apiKey is missing", async () => {
    await assert.rejects(() => eiaSource.fetch(BRENT, {}), {
      message: /API key is required/,
    });
  });
});
