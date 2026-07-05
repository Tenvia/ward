import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectiveWardMode } from "./effectiveMode.js";

describe("effectiveWardMode", () => {
  it("global enforce + tenant inherit -> enforce", () => {
    assert.strictEqual(effectiveWardMode("enforce", "inherit"), "enforce");
  });

  it("global observe + tenant inherit -> observe", () => {
    assert.strictEqual(effectiveWardMode("observe", "inherit"), "observe");
  });

  it("global enforce + tenant observe override -> observe", () => {
    assert.strictEqual(effectiveWardMode("enforce", "observe"), "observe");
  });

  it("global observe + tenant enforce override -> enforce", () => {
    assert.strictEqual(effectiveWardMode("observe", "enforce"), "enforce");
  });
});
