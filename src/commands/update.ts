import { getConfig } from "../config.js";
import { SOURCES, type Instrument } from "../sources/index.js";
import { writeCache, type BenchmarkEntry, type CacheFile } from "../cache.js";

export async function update(): Promise<void> {
  const config = await getConfig();
  const benchmarks: Record<string, BenchmarkEntry> = {};
  const errors: { instrument: Instrument; err: Error }[] = [];

  for (const source of SOURCES) {
    const auth = config.sourceAuth[source.key] ?? {};
    if (source.envVar && !auth.apiKey) {
      console.error(
        `  Skipping ${source.label}: no API key (set ${source.envVar}).`,
      );
      continue;
    }

    for (const instrument of source.instruments) {
      try {
        const data = await source.fetch(instrument, auth);
        const latest = data[0] || null;
        benchmarks[instrument.key] = {
          label: instrument.label,
          unit: instrument.unit,
          latest,
          history: data,
        };
      } catch (err) {
        errors.push({ instrument, err: err as Error });
      }
    }
  }

  const succeeded = Object.keys(benchmarks).length;

  if (succeeded > 0) {
    const cache: CacheFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      benchmarks,
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
      console.error(`  Warning: failed to fetch ${instrument.label}: ${err.message}`);
    }
  }

  if (succeeded > 0) {
    console.log(`\nUpdated ${succeeded} benchmark${succeeded === 1 ? "" : "s"}.`);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}
