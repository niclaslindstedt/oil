import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function readCache(cachePath: string): Promise<unknown | null> {
  try {
    const text = await readFile(cachePath, "utf-8");
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function writeCache(cachePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
