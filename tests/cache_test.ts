import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCache, writeCache } from "../dist/cache.js";

describe("cache", () => {
  it("returns null when cache file does not exist", async () => {
    const result = await readCache("/nonexistent/path/cache.json");
    assert.strictEqual(result, null);
  });

  it("writes and reads cache data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oil-test-"));
    const cachePath = join(dir, "sub", "prices.json");
    const data = { version: 1, updatedAt: "2026-04-15T00:00:00Z", benchmarks: {} };

    await writeCache(cachePath, data);
    const result = await readCache(cachePath);

    assert.deepStrictEqual(result, data);
    await rm(dir, { recursive: true });
  });

  it("creates nested directories when writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oil-test-"));
    const cachePath = join(dir, "a", "b", "c", "prices.json");

    await writeCache(cachePath, { test: true });
    const raw = await readFile(cachePath, "utf-8");

    assert.ok(raw.includes('"test"'));
    await rm(dir, { recursive: true });
  });

  it("returns null for corrupt JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oil-test-"));
    const cachePath = join(dir, "bad.json");
    await writeFile(cachePath, "not json{{{", "utf-8");

    const result = await readCache(cachePath);
    assert.strictEqual(result, null);
    await rm(dir, { recursive: true });
  });
});
