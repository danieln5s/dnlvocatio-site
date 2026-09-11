import { functionsUrl } from "@/lib/supabaseClient";

export class PhotoAccessError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PhotoAccessError";
    this.status = status;
  }
}

/**
 * Object URLs for already-fetched photos, keyed by storage path.
 *
 * Kept in memory only (never localStorage/sessionStorage/IndexedDB) and revoked
 * wholesale on sign-out so nothing survives the session.
 */
const objectUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

export const getCachedPhotoUrl = (path: string): string | undefined => objectUrls.get(path);

export const clearProtectedPhotoCache = (): void => {
  for (const objectUrl of objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrls.clear();
  inFlight.clear();
};

const request = async (path: string, accessToken: string): Promise<string> => {
  const base = functionsUrl();
  if (!base) {
    throw new PhotoAccessError("photo delivery is not configured", 0);
  }

  const endpoint = `${base}/photo?path=${encodeURIComponent(path)}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      // Session-authenticated: the token travels in a header on an XHR request,
      // never in a URL that could be copied, shared, logged or cached.
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
    });
  } catch {
    throw new PhotoAccessError("could not reach the photo service", 0);
  }

  if (!response.ok) {
    throw new PhotoAccessError(`photo request rejected (${response.status})`, response.status);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/**
 * Resolves to an object URL for a protected photo. Concurrent callers for the
 * same path share one network request.
 */
export const loadProtectedPhoto = async (path: string, accessToken: string): Promise<string> => {
  const cached = objectUrls.get(path);
  if (cached) return cached;

  const pending = inFlight.get(path);
  if (pending) return pending;

  const promise = request(path, accessToken)
    .then((objectUrl) => {
      objectUrls.set(path, objectUrl);
      return objectUrl;
    })
    .finally(() => {
      inFlight.delete(path);
    });

  inFlight.set(path, promise);
  return promise;
};
