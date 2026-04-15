import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTOML } from "../dist/toml.js";

describe("parseTOML", () => {
  it("parses key-value pairs with double quotes", () => {
    const result = parseTOML('api_key = "abc123"');
    assert.deepStrictEqual(result, { api_key: "abc123" });
  });

  it("parses key-value pairs with single quotes", () => {
    const result = parseTOML("name = 'hello'");
    assert.deepStrictEqual(result, { name: "hello" });
  });

  it("parses unquoted values", () => {
    const result = parseTOML("count = 42");
    assert.deepStrictEqual(result, { count: "42" });
  });

  it("ignores comments and blank lines", () => {
    const input = `# This is a comment
api_key = "abc"

# Another comment
name = "test"
`;
    const result = parseTOML(input);
    assert.deepStrictEqual(result, { api_key: "abc", name: "test" });
  });

  it("handles whitespace around keys and values", () => {
    const result = parseTOML('  api_key   =   "spaced"  ');
    assert.deepStrictEqual(result, { api_key: "spaced" });
  });

  it("returns empty object for empty input", () => {
    assert.deepStrictEqual(parseTOML(""), {});
  });

  it("ignores lines without equals sign", () => {
    const result = parseTOML("no equals here\nkey = \"val\"");
    assert.deepStrictEqual(result, { key: "val" });
  });

  it("parses empty arrays", () => {
    assert.deepStrictEqual(parseTOML("display = []"), { display: [] });
  });

  it("parses single-element arrays", () => {
    assert.deepStrictEqual(parseTOML('display = ["brent"]'), {
      display: ["brent"],
    });
  });

  it("parses multi-element arrays", () => {
    assert.deepStrictEqual(parseTOML('display = ["brent", "wti", "henryhub"]'), {
      display: ["brent", "wti", "henryhub"],
    });
  });

  it("parses arrays with single quotes and mixed whitespace", () => {
    assert.deepStrictEqual(parseTOML("display = [ 'brent' ,  'wti' ]"), {
      display: ["brent", "wti"],
    });
  });
});
