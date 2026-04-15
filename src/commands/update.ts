import { getConfig } from "../config.js";
import { SERIES, type Series } from "../series.js";
import { fetchSeries } from "../eia.js";
import { writeCache, type BenchmarkEntry, type CacheFile } from "../cache.js";

export async function update(): Promise<void> {
  const config = await getConfig();
  const benchmarks: Record<string, BenchmarkEntry> = {};
  const errors: { series: Series; err: Error }[] = [];

  for (const series of SERIES) {
    try {
      const data = await fetchSeries(config.apiKey, series);
      const latest = data[0] || null;
      benchmarks[series.key] = {
        label: series.label,
        unit: series.unit,
        latest,
        history: data,
      };
    } catch (err) {
      errors.push({ series, err: err as Error });
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
    for (const { series, err } of errors) {
      console.error(`  Warning: failed to fetch ${series.label}: ${err.message}`);
    }
  }

  if (succeeded > 0) {
    console.log(`\nUpdated ${succeeded} benchmark${succeeded === 1 ? "" : "s"}.`);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}
