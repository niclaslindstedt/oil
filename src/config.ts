import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseTOML, type TOMLValue } from "./toml.js";
import { SOURCES, allInstruments } from "./sources/index.js";

const CONFIG_DIR = join(homedir(), ".oil");
const CONFIG_FILE = join(CONFIG_DIR, "config.toml");
const CACHE_DIR = join(CONFIG_DIR, "cache");
const CACHE_FILE = join(CACHE_DIR, "prices.json");

export interface Config {
  sourceAuth: Record<string, { apiKey?: string }>;
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
  const validKeys = new Set(allInstruments().map((i) => i.key));
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

function resolveSourceAuth(
  file: Record<string, TOMLValue>,
): Record<string, { apiKey?: string }> {
  const auth: Record<string, { apiKey?: string }> = {};

  for (const source of SOURCES) {
    let apiKey: string | undefined;

    // 1. Environment variable (highest priority)
    if (source.envVar) {
      apiKey = process.env[source.envVar] || undefined;
    }

    // 2. Dotted config key: sources.<configKey>.api_key
    if (!apiKey && source.configKey) {
      const configVal = file[`sources.${source.configKey}.api_key`];
      if (typeof configVal === "string") {
        apiKey = configVal;
      }
    }

    // 3. Legacy top-level api_key (only for EIA, backward compat)
    if (!apiKey && source.key === "eia") {
      const legacy = file.api_key;
      if (typeof legacy === "string") {
        apiKey = legacy;
      }
    }

    if (apiKey) {
      auth[source.key] = { apiKey };
    }
  }

  return auth;
}

export async function getConfig(): Promise<Config> {
  const file = await loadConfigFile();
  const sourceAuth = resolveSourceAuth(file);

  return {
    sourceAuth,
    configDir: CONFIG_DIR,
    configFile: CONFIG_FILE,
    cacheDir: CACHE_DIR,
    cachePath: CACHE_FILE,
    display: resolveDisplay(file.display),
  };
}
