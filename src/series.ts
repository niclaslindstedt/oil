export interface Series {
  key: string;
  label: string;
  unit: string;
  route: string;
  facet: string;
}

export const SERIES: Series[] = [
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
];
