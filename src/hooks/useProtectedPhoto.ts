import { useCallback, useEffect, useState } from "react";

import { usePhotoAccess } from "@/context/photoAccessContext";
import { getCachedPhotoUrl, loadProtectedPhoto } from "@/lib/protectedPhotos";

export type ProtectedPhotoState = "idle" | "loading" | "ready" | "error";

export interface ProtectedPhoto {
  url: string | null;
  state: ProtectedPhotoState;
  retry: () => void;
}

/**
 * Fetches a protected photo through the authenticated delivery path.
 *
 * Returns `idle` with no URL whenever there is no verified session, which is
 * what keeps the public state free of photographs.
 */
export const useProtectedPhoto = (path: string): ProtectedPhoto => {
  const { status, epoch, getAccessToken } = usePhotoAccess();
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProtectedPhotoState>("idle");
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (status !== "verified") {
      setUrl(null);
      setState("idle");
      return;
    }

    const cached = getCachedPhotoUrl(path);
    if (cached) {
      setUrl(cached);
      setState("ready");
      return;
    }

    let cancelled = false;
    setState("loading");

    const load = async () => {
      const token = await getAccessToken();
      if (cancelled) return;

      if (!token) {
        setUrl(null);
        setState("error");
        return;
      }

      try {
        const objectUrl = await loadProtectedPhoto(path, token);
        if (cancelled) return;
        setUrl(objectUrl);
        setState("ready");
      } catch {
        if (cancelled) return;
        setUrl(null);
        setState("error");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [path, status, epoch, attempt, getAccessToken]);

  return { url, state, retry };
};
