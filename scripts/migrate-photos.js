/**
 * Migrate local photographs into the private Supabase Storage bucket.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
 *   node scripts/migrate-photos.js            # upload, then verify
 *   node scripts/migrate-photos.js --verify   # verify only, upload nothing
 *   node scripts/migrate-photos.js --dry-run  # list what would be uploaded
 *
 * Reads from ./private-photos/<gallery>/<file>. Nothing is deleted: the local
 * originals stay exactly where they are so the migration can be re-run.
 */

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const SOURCE_DIR = path.resolve(process.cwd(), "private-photos");
const BUCKET = process.env.PROTECTED_PHOTOS_BUCKET ?? "protected-photos";

const GALLERIES = ["wedding", "cycling", "fishing", "reading", "running", "travel"];

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

const args = new Set(process.argv.slice(2));
const verifyOnly = args.has("--verify");
const dryRun = args.has("--dry-run");

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!url || !serviceRoleKey)) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase =
  dryRun && !url
    ? null
    : createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const collect = async () => {
  const files = [];

  for (const gallery of GALLERIES) {
    const dir = path.join(SOURCE_DIR, gallery);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!CONTENT_TYPES[ext]) continue;

      const absolute = path.join(dir, entry.name);
      const { size } = await stat(absolute);
      files.push({
        absolute,
        objectPath: `${gallery}/${entry.name}`,
        contentType: CONTENT_TYPES[ext],
        size,
      });
    }
  }

  return files.sort((a, b) => a.objectPath.localeCompare(b.objectPath));
};

const upload = async (file) => {
  const body = await readFile(file.absolute);
  const { error } = await supabase.storage.from(BUCKET).upload(file.objectPath, body, {
    contentType: file.contentType,
    upsert: true,
    cacheControl: "no-store",
  });
  if (error) throw new Error(`${file.objectPath}: ${error.message}`);
};

/** Downloads each object back and compares its digest with the local file. */
const verify = async (files) => {
  const failures = [];

  for (const file of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(file.objectPath);
    if (error || !data) {
      failures.push(`${file.objectPath}: not readable (${error?.message ?? "no data"})`);
      continue;
    }

    const remote = Buffer.from(await data.arrayBuffer());
    const local = await readFile(file.absolute);

    const remoteDigest = createHash("sha256").update(remote).digest("hex");
    const localDigest = createHash("sha256").update(local).digest("hex");

    if (remoteDigest !== localDigest) {
      failures.push(`${file.objectPath}: checksum mismatch`);
    }
  }

  return failures;
};

/** Fails loudly if the bucket has been made public at any point. */
const assertBucketPrivate = async () => {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error) throw new Error(`bucket "${BUCKET}" not found: ${error.message}`);
  if (data.public) {
    throw new Error(`bucket "${BUCKET}" is PUBLIC. Make it private before migrating.`);
  }
};

const main = async () => {
  const files = await collect();

  if (files.length === 0) {
    console.error(`No images found under ${SOURCE_DIR}`);
    process.exit(1);
  }

  const totalMb = (files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1);
  console.log(`Found ${files.length} image(s) in ${SOURCE_DIR} (${totalMb} MB)`);

  if (dryRun) {
    files.forEach((file) => console.log(`  would upload  ${file.objectPath}`));
    return;
  }

  await assertBucketPrivate();

  if (!verifyOnly) {
    for (const file of files) {
      await upload(file);
      console.log(`  uploaded  ${file.objectPath}`);
    }
  }

  console.log("Verifying uploads…");
  const failures = await verify(files);

  if (failures.length > 0) {
    console.error(`\n${failures.length} object(s) failed verification:`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    console.error("\nKeep your local originals. Do not treat this migration as complete.");
    process.exit(1);
  }

  console.log(`\nAll ${files.length} object(s) verified byte-for-byte in "${BUCKET}".`);
  console.log("Local originals in private-photos/ were left untouched.");
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
