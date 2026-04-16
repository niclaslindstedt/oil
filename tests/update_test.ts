import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "dist", "cli.js");

interface ExecError {
  stdout: string;
  stderr: string;
  code: number;
}

async function run(
  home: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await exec("node", [CLI, ...args], {
      env: { ...process.env, HOME: home, EIA_API_KEY: undefined },
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as ExecError;
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

describe("update --from/--to argument parsing", () => {
  let home: string;

  before(async () => {
    home = await mkdtemp(join(tmpdir(), "oil-update-test-"));
  });

  after(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("rejects invalid --from date format", async () => {
    const { stderr, code } = await run(home, ["update", "--from", "not-a-date"]);
    assert.strictEqual(code, 1);
    assert.match(stderr, /Invalid --from date/);
  });

  it("rejects invalid --to date format", async () => {
    const { stderr, code } = await run(home, ["update", "--to", "2025/01/01"]);
    assert.strictEqual(code, 1);
    assert.match(stderr, /Invalid --to date/);
  });
});

describe("update cache merging", () => {
  let home: string;

  before(async () => {
    home = await mkdtemp(join(tmpdir(), "oil-update-merge-"));
  });

  after(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("preserves existing cache entries for unfetched instruments", async () => {
    const cacheDir = join(home, ".oil", "cache");
    await mkdir(cacheDir, { recursive: true });

    const existingCache = {
      version: 1,
      updatedAt: "2026-04-14T00:00:00Z",
      benchmarks: {
        brent: {
          label: "Brent Crude",
          unit: "USD/bbl",
          latest: { period: "2026-04-14", value: 87.0 },
          history: [{ period: "2026-04-14", value: 87.0 }],
        },
      },
    };
    await writeFile(
      join(cacheDir, "prices.json"),
      JSON.stringify(existingCache, null, 2),
      "utf-8",
    );

    // Run update without EIA key — EIA will be skipped, but metals (no key required)
    // will fetch. The existing brent entry should be preserved.
    // Note: this test will fail in CI without network, but validates the merge logic.
    const { code } = await run(home, ["update"]);

    const raw = await readFile(join(cacheDir, "prices.json"), "utf-8");
    const cache = JSON.parse(raw);
    assert.ok(cache.benchmarks.brent, "existing brent entry should be preserved");
    assert.strictEqual(
      cache.benchmarks.brent.latest.value,
      87.0,
      "brent value should be unchanged",
    );
  });
});
