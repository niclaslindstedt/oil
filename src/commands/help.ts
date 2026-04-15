import { version } from "../index.js";

export function help(): void {
  console.log(`oil v${version} — oil price tracker for your terminal

Usage: oil [command]

Commands:
  update    Fetch latest oil and gas prices from EIA
  help      Show this help text

Options:
  --version  Print version
  --help     Show this help text

Environment:
  EIA_API_KEY  EIA API key (or set api_key in ~/.oil/config.toml)
               Get a free key at https://www.eia.gov/opendata/register.php`);
}
