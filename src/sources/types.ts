export interface DataPoint {
  period: string;
  value: number;
}

export interface Instrument {
  key: string;
  label: string;
  unit: string;
}

export interface FetchOptions {
  length?: number;
  from?: string;
  to?: string;
}

export interface Source<I extends Instrument = Instrument> {
  key: string;
  label: string;
  envVar?: string;
  configKey?: string;
  instruments: I[];
  fetch(
    instrument: I,
    auth: { apiKey?: string },
    opts?: FetchOptions,
  ): Promise<DataPoint[]>;
}
