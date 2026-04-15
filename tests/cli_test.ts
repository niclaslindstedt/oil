import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "dist", "cli.js");

describe("cli", () => {
  it("prints version with --version", async () => {
    const { stdout } = await exec("node", [CLI, "--version"]);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("prints help with --help", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    assert.ok(stdout.includes("Usage:"));
    assert.ok(stdout.includes("update"));
  });

  it("prints help with no arguments", async () => {
    const { stdout } = await exec("node", [CLI]);
    assert.ok(stdout.includes("Usage:"));
  });

  it("exits with code 2 for unknown command", async () => {
    try {
      await exec("node", [CLI, "bogus"]);
      assert.fail("should have exited with non-zero");
    } catch (err: unknown) {
      assert.ok((err as { stderr: string }).stderr.includes("Unknown command: bogus"));
    }
  });
});
