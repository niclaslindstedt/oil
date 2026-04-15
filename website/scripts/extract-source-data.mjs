// Extract project metadata from source so the website never goes stale.
// Outputs website/src/generated/sourceData.json.
import fs from "node:fs";
import path from "node:path";

const out = {
  name: "oil",
  description: "A TUI CLI that visualizes the price of the important oil in the world. Sourcing data from free data sources.",
  generatedAt: new Date().toISOString(),
};

const dest = path.join("src", "generated");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "sourceData.json"), JSON.stringify(out, null, 2));
console.log("wrote", path.join(dest, "sourceData.json"));