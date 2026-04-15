import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
      env: { ...process.env, HOME: home, EIA_API_KEY: "test-key" },
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as ExecError;
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

async function seedHome(home: string, opts: {
  configToml?: string;
  cache?: unknown;
}): Promise<void> {
  const configDir = join(home, ".oil");
  const cacheDir = join(configDir, "cache");
  await mkdir(cacheDir, { recursive: true });
  if (opts.configToml !== undefined) {
    await writeFile(join(configDir, "config.toml"), opts.configToml, "utf-8");
  }
  if (opts.cache !== undefined) {
    await writeFile(
      join(cacheDir, "prices.json"),
      JSON.stringify(opts.cache, null, 2),
      "utf-8",
    );
  }
}

const SAMPLE_CACHE = {
  version: 1,
  updatedAt: "2026-04-15T12:00:00Z",
  benchmarks: {
    brent: {
      label: "Brent Crude",
      unit: "USD/bbl",
      latest: { period: "2026-04-14", value: 87.12 },
      history: [{ period: "2026-04-14", value: 87.12 }],
    },
    wti: {
      label: "WTI Crude",
      unit: "USD/bbl",
      latest: { period: "2026-04-14", value: 83.44 },
      history: [{ period: "2026-04-14", value: 83.44 }],
    },
    henryhub: {
      label: "Henry Hub Natural Gas",
      unit: "USD/MMBtu",
      latest: { period: "2026-04-14", value: 2.15 },
      history: [{ period: "2026-04-14", value: 2.15 }],
    },
  },
};

describe("show", () => {
  let home: string;

  before(async () => {
    home = await mkdtemp(join(tmpdir(), "oil-show-test-"));
  });

  after(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("shows all cached series when no filter configured", async () => {
    await seedHome(home, { cache: SAMPLE_CACHE });
    const { stdout, code } = await run(home, ["show"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /Brent Crude: \$87\.12/);
    assert.match(stdout, /WTI Crude: \$83\.44/);
    assert.match(stdout, /Henry Hub Natural Gas: \$2\.15/);
    assert.match(stdout, /Last updated: 2026-04-15T12:00:00Z/);
  });

  it("filters by positional series args", async () => {
    await seedHome(home, { cache: SAMPLE_CACHE });
    const { stdout, code } = await run(home, ["show", "brent"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /Brent Crude/);
    assert.ok(!stdout.includes("WTI Crude"));
    assert.ok(!stdout.includes("Henry Hub"));
  });

  it("filters by --series csv", async () => {
    await seedHome(home, { cache: SAMPLE_CACHE });
    const { stdout, code } = await run(home, ["show", "--series", "brent,henryhub"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /Brent Crude/);
    assert.match(stdout, /Henry Hub Natural Gas/);
    assert.ok(!stdout.includes("WTI Crude"));
  });

  it("uses display config when no CLI filter", async () => {
    await seedHome(home, {
      configToml: 'display = ["wti"]\n',
      cache: SAMPLE_CACHE,
    });
    const { stdout, code } = await run(home, ["show"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /WTI Crude/);
    assert.ok(!stdout.includes("Brent Crude"));
    assert.ok(!stdout.includes("Henry Hub"));
  });

  it("--all overrides config display filter", async () => {
    await seedHome(home, {
      configToml: 'display = ["wti"]\n',
      cache: SAMPLE_CACHE,
    });
    const { stdout, code } = await run(home, ["show", "--all"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /Brent Crude/);
    assert.match(stdout, /WTI Crude/);
    assert.match(stdout, /Henry Hub Natural Gas/);
  });

  it("exits 1 with helpful message when no cache exists", async () => {
    const emptyHome = await mkdtemp(join(tmpdir(), "oil-show-empty-"));
    try {
      const { stderr, code } = await run(emptyHome, ["show"]);
      assert.strictEqual(code, 1);
      assert.match(stderr, /No cached prices/);
      assert.match(stderr, /oil update/);
    } finally {
      await rm(emptyHome, { recursive: true, force: true });
    }
  });

  it("warns on unknown filter keys but still shows valid ones", async () => {
    await seedHome(home, { cache: SAMPLE_CACHE });
    const { stdout, stderr, code } = await run(home, ["show", "brent", "bogus"]);
    assert.strictEqual(code, 1);
    assert.match(stdout, /Brent Crude/);
    assert.match(stderr, /unknown series "bogus"/);
  });

  it("warns on unknown config display keys", async () => {
    await seedHome(home, {
      configToml: 'display = ["brent", "notreal"]\n',
      cache: SAMPLE_CACHE,
    });
    const { stdout, stderr, code } = await run(home, ["show"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /Brent Crude/);
    assert.ok(!stdout.includes("WTI Crude"));
    assert.match(stderr, /unknown series "notreal"/);
  });
});
