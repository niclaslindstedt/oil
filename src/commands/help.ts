import { version } from "../index.js";
import { SOURCES, allInstruments } from "../sources/index.js";

export function help(): void {
  const allKeys = allInstruments().map((i) => i.key);

  const sourceLines = SOURCES.map((s) => {
    const keys = s.instruments.map((i) => i.key).join(", ");
    const auth = s.envVar
      ? `(requires ${s.envVar})`
      : "(no API key required)";
    return `  ${s.label}: ${keys} ${auth}`;
  }).join("\n");

  const envLines = SOURCES
    .filter((s) => s.envVar)
    .map((s) => {
      const configHint = s.configKey
        ? ` (or set sources.${s.configKey}.api_key in config)`
        : "";
      return `  ${s.envVar!.padEnd(16)} ${s.label}${configHint}`;
    })
    .join("\n");

  console.log(`oil v${version} — commodity price tracker for your terminal

Usage: oil [command]

Commands:
  update    Fetch latest prices from all configured sources
  show      Show cached prices
  help      Show this help text

Update options:
  oil update                                      Fetch latest ~30 days (default)
  oil update --from 2025-01-01                    Fetch from date to today
  oil update --to 2026-03-01                      Fetch last month up to date
  oil update --from 2025-01-01 --to 2025-12-31   Fetch custom date range

Show options:
  oil show [series...]          Filter to listed series (e.g. brent gold)
  oil show --series brent,wti   Same, comma-separated
  oil show --all                Ignore the display filter from config

Options:
  --version  Print version
  --help     Show this help text

Sources:
${sourceLines}

Environment:
${envLines}

Config (~/.oil/config.toml):
  sources.eia.api_key = "your-key-here"
  display = ["brent", "wti"]    # which prices \`oil show\` displays by default
                                # valid keys: ${allKeys.join(", ")}`);
}
