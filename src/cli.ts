import { version } from "./index.js";
import { help } from "./commands/help.js";
import { update } from "./commands/update.js";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "update":
    await update();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    help();
    break;
  case "--version":
  case "-v":
    console.log(version);
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    help();
    process.exitCode = 2;
    break;
}
