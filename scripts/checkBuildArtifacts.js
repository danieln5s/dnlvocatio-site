/**
 * Scans a production build for protected photographs and for secrets.
 *
 * Used both as a CLI (`npm run check:build`) and from the test suite.
 */

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/** Non-photographic assets that are allowed to remain publicly served. */
export const PUBLIC_IMAGE_ALLOW_LIST = new Set(["favicon.ico", "social.png"]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".heic",
  ".tif",
  ".tiff",
  ".bmp",
]);

const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".map", ".xml"]);

const SECRET_PATTERNS = [
  { name: "Supabase service role key", pattern: /"?role"?\s*:\s*"service_role"/ },
  { name: "SUPABASE_SERVICE_ROLE_KEY literal", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/ },
  { name: "Resend API key", pattern: /\bre_[A-Za-z0-9]{20,}\b/ },
  { name: "Generic private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const walk = async (dir) => {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(absolute)));
    } else if (entry.isFile()) {
      out.push(absolute);
    }
  }

  return out;
};

const digestsOf = async (files) => {
  const map = new Map();
  for (const file of files) {
    const buffer = await readFile(file);
    map.set(createHash("sha256").update(buffer).digest("hex"), file);
  }
  return map;
};

/**
 * @returns {Promise<string[]>} human-readable violations; empty means clean.
 */
export const scanBuildOutput = async (distDir, protectedPhotoDir) => {
  const violations = [];

  const distFiles = await walk(distDir);
  if (distFiles.length === 0) {
    throw new Error(`No build output found at ${distDir}. Run the build first.`);
  }

  // 1. No photographic image assets other than the brand/icon allow-list.
  for (const file of distFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    if (PUBLIC_IMAGE_ALLOW_LIST.has(path.basename(file))) continue;
    violations.push(`protected image asset in build output: ${path.relative(distDir, file)}`);
  }

  // 2. No byte-identical copy of a protected photo, whatever it was renamed to.
  const protectedFiles = (await walk(protectedPhotoDir)).filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );

  if (protectedFiles.length > 0) {
    const protectedDigests = await digestsOf(protectedFiles);
    for (const file of distFiles) {
      const { size } = await stat(file);
      if (size === 0) continue;
      const digest = createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
      const match = protectedDigests.get(digest);
      if (match) {
        violations.push(
          `build output ${path.relative(distDir, file)} is a copy of protected photo ${path.basename(match)}`,
        );
      }
    }
  }

  // 3. No secrets.
  for (const file of distFiles) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const contents = await readFile(file, "utf8");
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(contents)) {
        violations.push(`${name} found in ${path.relative(distDir, file)}`);
      }
    }
  }

  return violations;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const distDir = path.resolve(process.cwd(), "dist");
  const photoDir = path.resolve(process.cwd(), "private-photos");

  scanBuildOutput(distDir, photoDir)
    .then((violations) => {
      if (violations.length > 0) {
        console.error(`Build output is NOT clean (${violations.length} problem(s)):`);
        violations.forEach((violation) => console.error(`  - ${violation}`));
        process.exit(1);
      }
      console.log("Build output contains no protected photographs and no secrets.");
    })
    .catch((error) => {
      console.error(error.message ?? error);
      process.exit(1);
    });
}
