import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SOURCES, allInstruments, findInstrument } from "../dist/sources/index.js";

describe("source registry", () => {
  it("has at least two sources", () => {
    assert.ok(SOURCES.length >= 2, `expected >= 2 sources, got ${SOURCES.length}`);
  });

  it("source keys are unique", () => {
    const keys = SOURCES.map((s) => s.key);
    assert.strictEqual(keys.length, new Set(keys).size);
  });

  it("instrument keys are globally unique", () => {
    const instruments = allInstruments();
    const keys = instruments.map((i) => i.key);
    assert.strictEqual(keys.length, new Set(keys).size);
  });
});

describe("allInstruments", () => {
  it("returns a flat list across all sources", () => {
    const instruments = allInstruments();
    const expectedCount = SOURCES.reduce((n, s) => n + s.instruments.length, 0);
    assert.strictEqual(instruments.length, expectedCount);
  });

  it("includes known EIA instruments", () => {
    const keys = allInstruments().map((i) => i.key);
    assert.ok(keys.includes("brent"));
    assert.ok(keys.includes("wti"));
  });

  it("includes known metals instruments", () => {
    const keys = allInstruments().map((i) => i.key);
    assert.ok(keys.includes("gold"));
    assert.ok(keys.includes("silver"));
  });
});

describe("findInstrument", () => {
  it("finds an EIA instrument", () => {
    const result = findInstrument("brent");
    assert.ok(result);
    assert.strictEqual(result.source.key, "eia");
    assert.strictEqual(result.instrument.key, "brent");
  });

  it("finds a metals instrument", () => {
    const result = findInstrument("gold");
    assert.ok(result);
    assert.strictEqual(result.source.key, "metals");
    assert.strictEqual(result.instrument.key, "gold");
  });

  it("returns undefined for unknown key", () => {
    const result = findInstrument("bogus");
    assert.strictEqual(result, undefined);
  });
});
