import type { Instrument, DataPoint, FetchOptions, Source } from "./types.js";

const BASE_URL = "https://stooq.com/q/d/l";

interface MetalsInstrument extends Instrument {
  ticker: string;
}

function parseCsv(text: string, length?: number): DataPoint[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row: Date,Open,High,Low,Close,Volume
  const rows = lines.slice(1);
  const points: DataPoint[] = [];

  for (const row of rows) {
    const cols = row.split(",");
    if (cols.length < 5) continue;
    const period = cols[0];
    const value = Number(cols[4]); // Close price
    if (period && !Number.isNaN(value)) {
      points.push({ period, value });
    }
  }

  // Stooq returns oldest-first; reverse to newest-first
  points.reverse();
  return length != null ? points.slice(0, length) : points;
}

function toStooqDate(iso: string): string {
  return iso.replace(/-/g, "");
}

async function fetchMetals(
  instrument: MetalsInstrument,
  _auth: { apiKey?: string },
  opts: FetchOptions = {},
): Promise<DataPoint[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("s", instrument.ticker);
  url.searchParams.set("i", "d");

  if (opts.from) url.searchParams.set("d1", toStooqDate(opts.from));
  if (opts.to) url.searchParams.set("d2", toStooqDate(opts.to));

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Stooq API error for ${instrument.label}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const text = await res.text();
  const useLength = (opts.from || opts.to) ? undefined : (opts.length ?? 30);
  return parseCsv(text, useLength);
}

export const metalsSource: Source<MetalsInstrument> = {
  key: "metals",
  label: "Precious Metals (Stooq)",
  instruments: [
    {
      key: "gold",
      label: "Gold",
      unit: "USD/oz",
      ticker: "xauusd",
    },
    {
      key: "silver",
      label: "Silver",
      unit: "USD/oz",
      ticker: "xagusd",
    },
    {
      key: "platinum",
      label: "Platinum",
      unit: "USD/oz",
      ticker: "xptusd",
    },
    {
      key: "palladium",
      label: "Palladium",
      unit: "USD/oz",
      ticker: "xpdusd",
    },
  ],
  fetch: fetchMetals,
};
