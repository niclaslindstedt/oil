import type { CacheFile } from "./cache.js";
import type { DataPoint } from "./sources/types.js";
import { allInstruments } from "./sources/index.js";

const ESC = "\x1b[";
const ALT_ENTER = ESC + "?1049h";
const ALT_EXIT = ESC + "?1049l";
const HIDE_CURSOR = ESC + "?25l";
const SHOW_CURSOR = ESC + "?25h";
const CLEAR = ESC + "2J" + ESC + "H";
const RESET = ESC + "0m";
const BOLD = ESC + "1m";
const DIM = ESC + "2m";
const INVERT = ESC + "7m";
const FG_CYAN = ESC + "36m";
const FG_GREEN = ESC + "32m";
const FG_YELLOW = ESC + "33m";
const FG_RED = ESC + "31m";

const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

interface Entry {
  key: string;
  label: string;
  unit: string;
  latest: DataPoint | null;
  history: DataPoint[];
}

type Tab = "prices" | "graphs";

export async function runTui(cache: CacheFile, filterKeys: string[]): Promise<void> {
  const filter = new Set(filterKeys);
  const entries: Entry[] = allInstruments()
    .filter((i) => (filter.size === 0 || filter.has(i.key)) && cache.benchmarks[i.key])
    .map((i) => {
      const b = cache.benchmarks[i.key]!;
      return { key: i.key, label: b.label, unit: b.unit, latest: b.latest, history: b.history };
    });

  let tab: Tab = "prices";
  const out = process.stdout;
  const stdin = process.stdin;

  const render = () => {
    const cols = out.columns || 80;
    const rows = out.rows || 24;
    let s = CLEAR;
    s += " " + BOLD + FG_CYAN + "oil" + RESET + "  " + DIM + "last updated " + cache.updatedAt + RESET + "\n";
    const tabs: [Tab, string][] = [["prices", "[1] Prices"], ["graphs", "[2] Graphs"]];
    s += " " + tabs.map(([k, lbl]) => k === tab ? INVERT + " " + lbl + " " + RESET : " " + lbl + " ").join("  ") + "\n";
    s += DIM + "─".repeat(cols) + RESET + "\n";
    s += tab === "prices" ? renderPrices(entries) : renderGraphs(entries, cols, rows - 6);
    s += ESC + rows + ";1H" + DIM + " 1/2 or tab: switch view    q: quit " + RESET;
    out.write(s);
  };

  out.write(ALT_ENTER + HIDE_CURSOR);
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  render();

  const onResize = () => render();
  out.on("resize", onResize);

  await new Promise<void>((resolve) => {
    const onData = (data: string) => {
      if (data === "q" || data === "\x03" || data === "\x1b") {
        stdin.off("data", onData);
        out.off("resize", onResize);
        resolve();
        return;
      }
      if (data === "1") { tab = "prices"; render(); return; }
      if (data === "2") { tab = "graphs"; render(); return; }
      if (data === "\t" || data === "l" || data === "h" || data === "\x1b[C" || data === "\x1b[D") {
        tab = tab === "prices" ? "graphs" : "prices";
        render();
      }
    };
    stdin.on("data", onData);
  });

  out.write(SHOW_CURSOR + ALT_EXIT);
  if (stdin.isTTY) stdin.setRawMode(false);
  stdin.pause();
}

function renderPrices(entries: Entry[]): string {
  if (entries.length === 0) return "  " + DIM + "No data." + RESET + "\n";
  const labelW = Math.max(9, ...entries.map((e) => e.label.length));
  const unitW = Math.max(4, ...entries.map((e) => e.unit.length));
  let s = "\n";
  s += "  " + BOLD + pad("Benchmark", labelW) + "   " + rpad("Price", 12) + "  " + pad("Unit", unitW) + "  " + "Date" + RESET + "\n\n";
  for (const e of entries) {
    const priceStr = e.latest ? "$" + e.latest.value.toFixed(2) : "N/A";
    const dateStr = e.latest?.period ?? "";
    const { color, arrow, delta } = trend(e.history);
    const priceCell = color + rpad(priceStr + " " + arrow + delta, 12) + RESET;
    s += "  " + pad(e.label, labelW) + "   " + priceCell + "  " + DIM + pad(e.unit, unitW) + "  " + dateStr + RESET + "\n";
  }
  return s;
}

function renderGraphs(entries: Entry[], cols: number, avail: number): string {
  if (entries.length === 0) return "  " + DIM + "No data." + RESET + "\n";
  const perEntry = Math.max(3, Math.floor(avail / entries.length));
  let s = "";
  for (const e of entries) s += renderGraph(e, cols, perEntry);
  return s;
}

function renderGraph(e: Entry, cols: number, height: number): string {
  const hist = e.history.slice().reverse();
  if (hist.length === 0) {
    let s = "  " + BOLD + e.label + RESET + "  " + DIM + "(no history)" + RESET + "\n";
    for (let i = 1; i < height; i++) s += "\n";
    return s;
  }
  const values = hist.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = hist[hist.length - 1];
  const { color } = trend(e.history);

  let s = "  " + BOLD + e.label + RESET
    + "  " + color + "$" + latest.value.toFixed(2) + RESET
    + "   " + DIM + "min $" + min.toFixed(2) + "   max $" + max.toFixed(2)
    + "   " + hist.length + " pts" + RESET + "\n";

  const width = Math.max(10, cols - 4);
  const sampled = downsample(values, width);
  const range = max - min || 1;
  let line = "  " + color;
  for (const v of sampled) {
    const norm = (v - min) / range;
    const idx = Math.max(0, Math.min(SPARK.length - 1, Math.round(norm * (SPARK.length - 1))));
    line += SPARK[idx];
  }
  line += RESET + "\n";
  s += line;
  for (let i = 2; i < height; i++) s += "\n";
  return s;
}

function downsample(values: number[], width: number): number[] {
  if (values.length <= width) return values;
  const out: number[] = [];
  const bucket = values.length / width;
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end && j < values.length; j++) { sum += values[j]; n++; }
    out.push(n > 0 ? sum / n : values[values.length - 1]!);
  }
  return out;
}

function trend(history: DataPoint[]): { color: string; arrow: string; delta: string } {
  if (history.length < 2) return { color: "", arrow: " ", delta: "" };
  const a = history[0].value;
  const b = history[1].value;
  if (a == null || b == null) return { color: "", arrow: " ", delta: "" };
  const diff = a - b;
  const pct = (diff / b) * 100;
  const sign = diff > 0 ? "+" : "";
  const delta = sign + pct.toFixed(2) + "%";
  if (diff > 0) return { color: FG_GREEN, arrow: "▲", delta };
  if (diff < 0) return { color: FG_RED, arrow: "▼", delta };
  return { color: FG_YELLOW, arrow: "•", delta };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function rpad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}
