import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../safe-next.ts";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    assert.equal(safeNext("/contact?interest=Product%20Demonstration"), "/contact?interest=Product%20Demonstration");
    assert.equal(safeNext(["/workshops"]), "/workshops");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
      assert.equal(safeNext(bad), "/");
    }
  });
});
