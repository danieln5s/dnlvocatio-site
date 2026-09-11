/**
 * Path validation shared by the Edge Function and the browser bundle.
 *
 * Deliberately dependency-free so the same rules can be unit tested with Vitest
 * (Node) and imported by Deno without a build step.
 */

/** Galleries that may be served from the protected bucket. */
export const PROTECTED_GALLERIES = [
  "wedding",
  "cycling",
  "fishing",
  "reading",
  "running",
  "travel",
] as const;

export type ProtectedGallery = (typeof PROTECTED_GALLERIES)[number];

/** `<gallery>/<file>.<ext>` — no nesting, no traversal, no encoded separators. */
const OBJECT_PATH = /^[a-z0-9-]{1,32}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(jpe?g|png|webp|avif|gif)$/i;

export interface ParsedPhotoPath {
  gallery: ProtectedGallery;
  path: string;
}

/**
 * Returns the normalised path, or `null` when the request must be rejected.
 * Rejection is deliberate and silent: callers respond 404 so the endpoint does
 * not confirm whether a given file exists.
 */
export const parsePhotoPath = (raw: string | null | undefined): ParsedPhotoPath | null => {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (value.length === 0 || value.length > 160) return null;

  // Reject anything that could decode into a traversal or a different object.
  if (value.includes("..") || value.includes("\\") || value.includes("%") || value.includes("\0")) {
    return null;
  }
  if (value.startsWith("/") || value.endsWith("/")) return null;
  if (!OBJECT_PATH.test(value)) return null;

  const gallery = value.slice(0, value.indexOf("/")).toLowerCase();
  if (!(PROTECTED_GALLERIES as readonly string[]).includes(gallery)) return null;

  return { gallery: gallery as ProtectedGallery, path: value };
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export const contentTypeForPath = (path: string): string => {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
};
