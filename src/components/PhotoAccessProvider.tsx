import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import PhotoAccessDialog from "@/components/PhotoAccessDialog";
import {
  PhotoAccessContext,
  type PhotoAccessContextValue,
  type PhotoAccessStatus,
} from "@/context/photoAccessContext";
import { clearProtectedPhotoCache } from "@/lib/protectedPhotos";
import { isPhotoAccessConfigured, supabase } from "@/lib/supabaseClient";

interface Props {
  children: ReactNode;
}

/**
 * Owns the verified-visitor session.
 *
 * The session is stored and refreshed by supabase-js. Any state other than a
 * live, non-expired session resolves to the public view, so an expired or
 * broken session degrades to "no photos" rather than a broken page.
 */
const PhotoAccessProvider = ({ children }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<PhotoAccessStatus>(
    isPhotoAccessConfigured ? "loading" : "unavailable",
  );
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
        setStatus(data.session ? "verified" : "public");
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setStatus("public");
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((eventName, nextSession) => {
      if (!active) return;

      if (eventName === "SIGNED_OUT" || !nextSession) {
        clearProtectedPhotoCache();
        setEpoch((value) => value + 1);
        setSession(null);
        setStatus("public");
        return;
      }

      setSession(nextSession);
      setStatus("verified");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;
    // Reads through supabase-js so a token close to expiry is refreshed first.
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }, []);

  const requestCode = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error("Photo access is not configured for this site yet.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Visitors are created automatically; there is no registration screen.
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) {
      throw new Error("Photo access is not configured for this site yet.");
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    clearProtectedPhotoCache();
    setEpoch((value) => value + 1);
    setSession(null);
    setStatus(isPhotoAccessConfigured ? "public" : "unavailable");

    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  const value = useMemo<PhotoAccessContextValue>(
    () => ({
      status,
      email: session?.user?.email ?? null,
      expiresAt: session?.expires_at ?? null,
      epoch,
      isDialogOpen,
      openDialog,
      closeDialog,
      getAccessToken,
      requestCode,
      verifyCode,
      signOut,
    }),
    [
      status,
      session,
      epoch,
      isDialogOpen,
      openDialog,
      closeDialog,
      getAccessToken,
      requestCode,
      verifyCode,
      signOut,
    ],
  );

  return (
    <PhotoAccessContext.Provider value={value}>
      {children}
      <PhotoAccessDialog />
    </PhotoAccessContext.Provider>
  );
};

export default PhotoAccessProvider;
