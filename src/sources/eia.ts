import type { Instrument, DataPoint, FetchOptions, Source } from "./types.js";

const BASE_URL = "https://api.eia.gov/v2";

export interface EiaInstrument extends Instrument {
  route: string;
  facet: string;
}

const PAGE_SIZE = 5000;

function buildUrl(
  instrument: EiaInstrument,
  apiKey: string,
  opts: FetchOptions & { offset?: number },
): URL {
  const url = new URL(`${BASE_URL}/${instrument.route}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "daily");
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("facets[series][]", instrument.facet);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");

  if (opts.from || opts.to) {
    if (opts.from) url.searchParams.set("start", opts.from);
    if (opts.to) url.searchParams.set("end", opts.to);
    url.searchParams.set("length", String(PAGE_SIZE));
    if (opts.offset) url.searchParams.set("offset", String(opts.offset));
  } else {
    url.searchParams.set("length", String(opts.length ?? 30));
  }

  return url;
}

async function fetchPage(
  url: URL,
  label: string,
): Promise<DataPoint[]> {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `EIA API error for ${label}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const json = await res.json();
  const data = (json as { response?: { data?: unknown[] } })?.response?.data;

  if (!Array.isArray(data)) {
    throw new Error(
      `EIA API returned unexpected format for ${label}`,
    );
  }

  return data.map((d) => ({
    period: (d as Record<string, unknown>).period as string,
    value: (d as Record<string, unknown>).value as number,
  }));
}

async function fetchEia(
  instrument: EiaInstrument,
  auth: { apiKey?: string },
  opts: FetchOptions = {},
): Promise<DataPoint[]> {
  if (!auth.apiKey) {
    throw new Error(`EIA API key is required to fetch ${instrument.label}`);
  }

  if (!opts.from && !opts.to) {
    const url = buildUrl(instrument, auth.apiKey, opts);
    return fetchPage(url, instrument.label);
  }

  const all: DataPoint[] = [];
  let offset = 0;

  for (;;) {
    const url = buildUrl(instrument, auth.apiKey, { ...opts, offset });
    const page = await fetchPage(url, instrument.label);
    all.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;

    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
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
