// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { scanBuildOutput } from "../scripts/checkBuildArtifacts.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const photoDir = path.join(root, "private-photos");

const hasBuild = existsSync(distDir);

describe.skipIf(!hasBuild)("production build artifacts", () => {
  it("contains no protected photographs and no secrets", async () => {
    const violations = await scanBuildOutput(distDir, photoDir);
    expect(violations).toEqual([]);
  });
});

describe("repository layout", () => {
  it("serves no photographs from public/", () => {
    const publicDir = path.join(root, "public");
    for (const gallery of ["wedding", "cycling", "fishing", "reading", "running", "travel"]) {
      expect(existsSync(path.join(publicDir, gallery))).toBe(false);
    }
  });
});
