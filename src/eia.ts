import type { Series } from "./series.js";

const BASE_URL = "https://api.eia.gov/v2";

export interface DataPoint {
  period: string;
  value: number;
}

interface FetchOptions {
  length?: number;
}

export async function fetchSeries(
  apiKey: string,
  series: Series,
  { length = 30 }: FetchOptions = {},
): Promise<DataPoint[]> {
  const url = new URL(`${BASE_URL}/${series.route}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "daily");
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("facets[series][]", series.facet);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("length", String(length));

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `EIA API error for ${series.label}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const json = await res.json();
  const data = (json as { response?: { data?: unknown[] } })?.response?.data;

  if (!Array.isArray(data)) {
    throw new Error(
      `EIA API returned unexpected format for ${series.label}`,
    );
  }

  return data.map((d) => ({
    period: (d as Record<string, unknown>).period as string,
    value: (d as Record<string, unknown>).value as number,
  }));
}
