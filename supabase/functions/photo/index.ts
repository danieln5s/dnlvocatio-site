/**
 * Authenticated delivery path for protected photographs.
 *
 *   GET /functions/v1/photo?path=<gallery>/<file>
 *   Authorization: Bearer <supabase access token>
 *
 * The bucket is private and no storage policy grants anon/authenticated access,
 * so this function is the only way to read the bytes. Every served request is
 * written to the private access log before the response is returned.
 */

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { contentTypeForPath, parsePhotoPath } from "../_shared/photoPath.ts";
import { notificationsEnabled, sendOwnerNotification } from "../_shared/notify.ts";

const BUCKET = Deno.env.get("PROTECTED_PHOTOS_BUCKET") ?? "protected-photos";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Never cached by a shared cache, never written to disk by the browser. */
const NO_STORE: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Vary: "Authorization, Origin",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), ...NO_STORE, "Content-Type": "application/json" },
  });

/**
 * Reads `session_id` out of an access token whose signature has already been
 * validated by `auth.getUser`. Used only for notification de-duplication.
 */
const readSessionId = (token: string): string | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalised = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded)) as { session_id?: string };
    return typeof claims.session_id === "string" ? claims.session_id : null;
  } catch {
    return null;
  }
};

const recordAccess = async (args: {
  userId: string;
  sessionId: string | null;
  gallery: string;
  photoPath: string;
  outcome: "allowed" | "denied" | "not_found";
}) => {
  const { error } = await admin.rpc("record_photo_access", {
    p_user_id: args.userId,
    p_session_id: args.sessionId,
    p_gallery: args.gallery,
    p_photo_path: args.photoPath,
    p_event_type: "photo_request",
    p_outcome: args.outcome,
  });

  if (error) {
    console.error("failed to record photo access", error.message);
  }
};

const maybeNotifyOwner = async (args: {
  userId: string;
  sessionId: string | null;
  gallery: string;
  photoPath: string;
}) => {
  if (!notificationsEnabled()) return;

  // One notification per verified session; falls back to the user when the
  // token carries no session claim.
  const dedupKey = args.sessionId ? `session:${args.sessionId}` : `user:${args.userId}`;

  const { data, error } = await admin.rpc("claim_photo_access_notification", {
    p_user_id: args.userId,
    p_dedup_key: dedupKey,
  });

  if (error) {
    console.error("failed to claim owner notification", error.message);
    return;
  }

  const claim = Array.isArray(data) ? data[0] : data;
  if (!claim?.should_notify) return;

  try {
    await sendOwnerNotification({
      visitorEmail: claim.email,
      gallery: args.gallery,
      photoPath: args.photoPath,
      occurredAt: new Date().toISOString(),
    });
    await admin.rpc("mark_photo_access_notification", {
      p_dedup_key: dedupKey,
      p_delivered: true,
      p_error: null,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("owner notification failed", message);
    await admin.rpc("mark_photo_access_notification", {
      p_dedup_key: dedupKey,
      p_delivered: false,
      p_error: message.slice(0, 500),
    });
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "GET") {
    return json(req, 405, { error: "method_not_allowed" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (!token || token === ANON_KEY) {
    return json(req, 401, { error: "verification_required" });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user || !user.email) {
    return json(req, 401, { error: "verification_required" });
  }

  // Path parsing happens after authentication so unauthenticated callers learn
  // nothing about which paths exist.
  const parsed = parsePhotoPath(new URL(req.url).searchParams.get("path"));
  if (!parsed) {
    return json(req, 404, { error: "not_found" });
  }

  const sessionId = readSessionId(token);

  const { data: file, error: downloadError } = await admin.storage
    .from(BUCKET)
    .download(parsed.path);

  if (downloadError || !file) {
    await recordAccess({
      userId: user.id,
      sessionId,
      gallery: parsed.gallery,
      photoPath: parsed.path,
      outcome: "not_found",
    });
    return json(req, 404, { error: "not_found" });
  }

  await recordAccess({
    userId: user.id,
    sessionId,
    gallery: parsed.gallery,
    photoPath: parsed.path,
    outcome: "allowed",
  });

  // Delivery must not wait on the mail provider.
  const notify = maybeNotifyOwner({
    userId: user.id,
    sessionId,
    gallery: parsed.gallery,
    photoPath: parsed.path,
  }).catch(() => undefined);

  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  runtime?.waitUntil(notify);

  return new Response(file.stream(), {
    status: 200,
    headers: {
      ...corsHeaders(req),
      ...NO_STORE,
      "Content-Type": file.type || contentTypeForPath(parsed.path),
      "Content-Disposition": "inline",
    },
  });
});
