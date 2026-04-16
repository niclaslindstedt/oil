import { getConfig } from "../config.js";
import { SOURCES, type Instrument } from "../sources/index.js";
import type { DataPoint, FetchOptions } from "../sources/types.js";
import {
  readCache,
  writeCache,
  type BenchmarkEntry,
  type CacheFile,
} from "../cache.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface UpdateOptions {
  from?: string;
  to?: string;
}

function parseArgs(args: string[]): UpdateOptions {
  let from: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--from") {
      from = args[++i];
    } else if (arg.startsWith("--from=")) {
      from = arg.slice("--from=".length);
    } else if (arg === "--to") {
      to = args[++i];
    } else if (arg.startsWith("--to=")) {
      to = arg.slice("--to=".length);
    }
  }

  if (from !== undefined && !DATE_RE.test(from)) {
    throw new Error(`Invalid --from date "${from}". Expected YYYY-MM-DD.`);
  }
  if (to !== undefined && !DATE_RE.test(to)) {
    throw new Error(`Invalid --to date "${to}". Expected YYYY-MM-DD.`);
  }

  return { from, to };
}

function mergeHistory(
  existing: DataPoint[],
  incoming: DataPoint[],
): DataPoint[] {
  const map = new Map<string, number>();
  for (const dp of existing) map.set(dp.period, dp.value);
  for (const dp of incoming) map.set(dp.period, dp.value);

  return Array.from(map, ([period, value]) => ({ period, value })).sort(
    (a, b) => (a.period > b.period ? -1 : a.period < b.period ? 1 : 0),
  );
}

export async function update(args: string[] = []): Promise<void> {
  const opts = parseArgs(args);
  const config = await getConfig();

  const fetchOpts: FetchOptions = {};
  if (opts.from || opts.to) {
    fetchOpts.from = opts.from;
    fetchOpts.to = opts.to;
  }

  const existing = (await readCache(config.cachePath)) as CacheFile | null;
  const benchmarks: Record<string, BenchmarkEntry> = {};
  const errors: { instrument: Instrument; err: Error }[] = [];

  let first = true;

  for (const source of SOURCES) {
    const auth = config.sourceAuth[source.key] ?? {};
    if (source.envVar && !auth.apiKey) {
      console.error(
        `  Skipping ${source.label}: no API key (set ${source.envVar}).`,
      );
      continue;
    }

    for (const instrument of source.instruments) {
      if (!first) await sleep(300);
      first = false;

      try {
        const data = await source.fetch(instrument, auth, fetchOpts);
        const oldHistory =
          existing?.benchmarks?.[instrument.key]?.history ?? [];
        const merged = mergeHistory(oldHistory, data);
        const latest = merged[0] || null;

        benchmarks[instrument.key] = {
          label: instrument.label,
          unit: instrument.unit,
          latest,
          history: merged,
        };
      } catch (err) {
        errors.push({ instrument, err: err as Error });
      }
    }
  }

  const succeeded = Object.keys(benchmarks).length;

  if (succeeded > 0) {
    // Preserve any instruments we didn't fetch this time
    const merged: Record<string, BenchmarkEntry> = {};
    if (existing?.benchmarks) {
      for (const [key, entry] of Object.entries(existing.benchmarks)) {
        merged[key] = entry;
      }
    }
    for (const [key, entry] of Object.entries(benchmarks)) {
      merged[key] = entry;
    }

    const cache: CacheFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      benchmarks: merged,
    };
    await writeCache(config.cachePath, cache);
  }

  for (const [, b] of Object.entries(benchmarks)) {
    const price = b.latest?.value != null ? `$${b.latest.value}` : "N/A";
    const date = b.latest?.period ?? "";
    console.log(`  ${b.label}: ${price} (${date})`);
  }

  if (errors.length > 0) {
    console.error("");
    for (const { instrument, err } of errors) {
      console.error(
        `  Warning: failed to fetch ${instrument.label}: ${err.message}`,
      );
    }
  }

  if (succeeded > 0) {
    console.log(
      `\nUpdated ${succeeded} benchmark${succeeded === 1 ? "" : "s"}.`,
    );
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}
