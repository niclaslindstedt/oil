import { eiaSource } from "./eia.js";
import { metalsSource } from "./metals.js";
import type { Source, Instrument } from "./types.js";

export type { DataPoint, Instrument, FetchOptions, Source } from "./types.js";

export const SOURCES: Source[] = [eiaSource, metalsSource];

// Validate that instrument keys are globally unique at import time.
const seen = new Set<string>();
for (const source of SOURCES) {
  for (const instrument of source.instruments) {
    if (seen.has(instrument.key)) {
      throw new Error(
        `Duplicate instrument key "${instrument.key}" across sources`,
      );
    }
    seen.add(instrument.key);
  }
}

export function allInstruments(): Instrument[] {
  return SOURCES.flatMap((s) => s.instruments);
}

export function findInstrument(
  key: string,
): { source: Source; instrument: Instrument } | undefined {
  for (const source of SOURCES) {
    const instrument = source.instruments.find((i) => i.key === key);
    if (instrument) return { source, instrument };
  }
  return undefined;
}
