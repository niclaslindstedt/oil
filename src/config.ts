import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseTOML, type TOMLValue } from "./toml.js";
import { SERIES } from "./series.js";

const CONFIG_DIR = join(homedir(), ".oil");
const CONFIG_FILE = join(CONFIG_DIR, "config.toml");
const CACHE_DIR = join(CONFIG_DIR, "cache");
const CACHE_FILE = join(CACHE_DIR, "prices.json");

export interface Config {
  apiKey: string;
  configDir: string;
  configFile: string;
  cacheDir: string;
  cachePath: string;
  display: string[];
}

async function loadConfigFile(): Promise<Record<string, TOMLValue>> {
  try {
    const text = await readFile(CONFIG_FILE, "utf-8");
    return parseTOML(text);
  } catch {
    return {};
  }
}

function resolveDisplay(raw: TOMLValue | undefined): string[] {
  if (raw === undefined) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const validKeys = new Set(SERIES.map((s) => s.key));
  const result: string[] = [];
  for (const entry of list) {
    if (validKeys.has(entry)) {
      result.push(entry);
    } else {
      console.error(
        `Warning: unknown series "${entry}" in config display list (ignored).`,
      );
    }
  }
  return result;
}

export async function getConfig(): Promise<Config> {
  const file = await loadConfigFile();
  const rawApiKey = file.api_key;
  const apiKey =
    process.env.EIA_API_KEY ||
    (typeof rawApiKey === "string" ? rawApiKey : undefined);

  if (!apiKey) {
    console.error(
      "Error: No EIA API key found.\n\n" +
        "Set the EIA_API_KEY environment variable or add api_key to ~/.oil/config.toml:\n\n" +
        '  api_key = "your-key-here"\n\n' +
        "Get a free API key at: https://www.eia.gov/opendata/register.php",
    );
    process.exit(2);
  }

  return {
    apiKey,
    configDir: CONFIG_DIR,
    configFile: CONFIG_FILE,
    cacheDir: CACHE_DIR,
    cachePath: CACHE_FILE,
    display: resolveDisplay(file.display),
  };
}
