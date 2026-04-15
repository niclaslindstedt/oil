export type TOMLValue = string | string[];

export function parseTOML(text: string): Record<string, TOMLValue> {
  const result: Record<string, TOMLValue> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      result[key] = parseArray(value.slice(1, -1));
      continue;
    }

    result[key] = stripQuotes(value);
  }
  return result;
}

function parseArray(inner: string): string[] {
  const trimmed = inner.trim();
  if (trimmed === "") return [];
  return trimmed.split(",").map((item) => stripQuotes(item.trim()));
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
