import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseTOML } from "./toml.js";

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
}

async function loadConfigFile(): Promise<Record<string, string>> {
  try {
    const text = await readFile(CONFIG_FILE, "utf-8");
    return parseTOML(text);
  } catch {
    return {};
  }
}

export async function getConfig(): Promise<Config> {
  const file = await loadConfigFile();
  const apiKey = process.env.EIA_API_KEY || file.api_key;

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
  };
}
