# oil

> A TUI CLI that visualizes the price of the important oil in the world. Sourcing data from free data sources.

## Synopsis

```
oil [OPTIONS] [COMMAND]
```

## Description

Fetches and displays oil and gas prices from global benchmarks. Data is sourced
from the U.S. Energy Information Administration (EIA) API.

## Subcommands

| Command | Description |
|---|---|
| `update` | Fetch latest oil and gas prices and save to local cache. |
| `help` | Show help text. |

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--version` | bool | false | Print version and exit. |
| `--help`    | bool | false | Print help and exit. |

## Environment variables

| Variable | Description |
|---|---|
| `EIA_API_KEY` | API key for the EIA API. Overrides `api_key` in `~/.oil/config.toml`. Get a free key at https://www.eia.gov/opendata/register.php |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic error |
| 2 | Usage error |

## Examples

```sh
# Show help
oil --help

# Fetch latest prices
oil update
```

## See also

- `oil commands`
- `oil docs`