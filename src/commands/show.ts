import { getConfig } from "../config.js";
import { SERIES } from "../series.js";
import { readCache, type CacheFile } from "../cache.js";

interface ShowOptions {
  filter: string[];
  all: boolean;
  unknown: string[];
}

function parseArgs(args: string[]): ShowOptions {
  const filter: string[] = [];
  let all = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") {
      all = true;
    } else if (arg === "--series") {
      const next = args[i + 1];
      if (next !== undefined) {
        filter.push(...next.split(",").map((s) => s.trim()).filter(Boolean));
        i++;
      }
    } else if (arg.startsWith("--series=")) {
      const csv = arg.slice("--series=".length);
      filter.push(...csv.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (arg.startsWith("--")) {
      console.error(`Warning: unknown flag "${arg}" (ignored).`);
    } else {
      filter.push(arg);
    }
  }

  const validKeys = new Set(SERIES.map((s) => s.key));
  const known: string[] = [];
  const unknown: string[] = [];
  for (const key of filter) {
    if (validKeys.has(key)) {
      known.push(key);
    } else {
      unknown.push(key);
    }
  }

  return { filter: known, all, unknown };
}

export async function show(args: string[]): Promise<void> {
  const config = await getConfig();
  const opts = parseArgs(args);

  for (const key of opts.unknown) {
    console.error(`Warning: unknown series "${key}" (ignored).`);
    process.exitCode = 1;
  }

  const raw = await readCache(config.cachePath);
  if (!raw) {
    console.error("No cached prices. Run `oil update` first.");
    process.exitCode = 1;
    return;
  }

  const cache = raw as CacheFile;

  let activeFilter: string[];
  if (opts.all) {
    activeFilter = [];
  } else if (opts.filter.length > 0) {
    activeFilter = opts.filter;
  } else {
    activeFilter = config.display;
  }

  const filterSet = new Set(activeFilter);
  const entries = SERIES.filter((s) => {
    if (filterSet.size > 0 && !filterSet.has(s.key)) return false;
    return cache.benchmarks[s.key] !== undefined;
  });

  if (entries.length === 0) {
    console.error("No prices to show.");
    return;
  }

  for (const series of entries) {
    const b = cache.benchmarks[series.key];
    const price = b.latest?.value != null ? `$${b.latest.value}` : "N/A";
    const date = b.latest?.period ?? "";
    console.log(`  ${b.label}: ${price} (${date})`);
  }

  console.log(`\nLast updated: ${cache.updatedAt}`);
}
