import { version } from "../index.js";

export function help(): void {
  console.log(`oil v${version} — oil and gas price tracker for your terminal

Usage: oil [command]

Commands:
  update    Fetch latest oil and gas prices from EIA
  show      Show cached oil and gas prices
  help      Show this help text

Show options:
  oil show [series...]          Filter to listed series (e.g. brent wti)
  oil show --series brent,wti   Same, comma-separated
  oil show --all                Ignore the display filter from config

Options:
  --version  Print version
  --help     Show this help text

Environment:
  EIA_API_KEY  EIA API key (or set api_key in ~/.oil/config.toml)
               Get a free key at https://www.eia.gov/opendata/register.php

Config (~/.oil/config.toml):
  api_key = "your-key-here"
  display = ["brent", "wti"]    # which prices \`oil show\` displays by default
                                # valid keys: brent, wti, dubai, henryhub`);
}
