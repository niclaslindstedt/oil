import type { Instrument, DataPoint, FetchOptions, Source } from "./types.js";

const BASE_URL = "https://api.eia.gov/v2";

export interface EiaInstrument extends Instrument {
  route: string;
  facet: string;
}

async function fetchEia(
  instrument: EiaInstrument,
  auth: { apiKey?: string },
  { length = 30 }: FetchOptions = {},
): Promise<DataPoint[]> {
  if (!auth.apiKey) {
    throw new Error(`EIA API key is required to fetch ${instrument.label}`);
  }

  const url = new URL(`${BASE_URL}/${instrument.route}`);
  url.searchParams.set("api_key", auth.apiKey);
  url.searchParams.set("frequency", "daily");
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("facets[series][]", instrument.facet);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("length", String(length));

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `EIA API error for ${instrument.label}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const json = await res.json();
  const data = (json as { response?: { data?: unknown[] } })?.response?.data;

  if (!Array.isArray(data)) {
    throw new Error(
      `EIA API returned unexpected format for ${instrument.label}`,
    );
  }

  return data.map((d) => ({
    period: (d as Record<string, unknown>).period as string,
    value: (d as Record<string, unknown>).value as number,
  }));
}

export const eiaSource: Source<EiaInstrument> = {
  key: "eia",
  label: "U.S. Energy Information Administration",
  envVar: "EIA_API_KEY",
  configKey: "eia",
  instruments: [
    {
      key: "brent",
      label: "Brent Crude",
      unit: "USD/bbl",
      route: "petroleum/pri/spt/data",
      facet: "RBRTE",
    },
    {
      key: "wti",
      label: "WTI Crude",
      unit: "USD/bbl",
      route: "petroleum/pri/spt/data",
      facet: "RWTC",
    },
    {
      key: "dubai",
      label: "Dubai Fateh Crude",
      unit: "USD/bbl",
      route: "petroleum/pri/spt/data",
      facet: "RDUBTE",
    },
    {
      key: "henryhub",
      label: "Henry Hub Natural Gas",
      unit: "USD/MMBtu",
      route: "natural-gas/pri/fut/data",
      facet: "RNGWHHD",
    },
  ],
  fetch: fetchEia,
};
