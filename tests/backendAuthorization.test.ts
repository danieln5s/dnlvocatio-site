// @vitest-environment node
/**
 * Integration tests against a REAL Supabase backend (local or a staging project).
 *
 * These exercise server-side authorization; the rest of the suite is mocked UI.
 * They are skipped unless the environment is provided:
 *
 *   supabase start
 *   supabase functions serve photo --env-file supabase/functions/.env.local
 *   $env:E2E_SUPABASE_URL="http://127.0.0.1:54321"
 *   $env:E2E_SUPABASE_ANON_KEY="<anon key>"
 *   $env:E2E_SUPABASE_SERVICE_ROLE_KEY="<service role key>"
 *   $env:E2E_PHOTO_PATH="wedding/primephoto-24.JPG"   # must exist in the bucket
 *   npx vitest run tests/backendAuthorization.test.ts
 */

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.E2E_SUPABASE_URL;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const photoPath = process.env.E2E_PHOTO_PATH ?? "wedding/primephoto-24.JPG";
const bucket = process.env.E2E_BUCKET ?? "protected-photos";

const configured = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!configured)("backend authorization (real Supabase)", () => {
  const photoEndpoint = (value: string) =>
    `${url}/functions/v1/photo?path=${encodeURIComponent(value)}`;

  let admin: ReturnType<typeof createClient>;
  let visitor: ReturnType<typeof createClient>;

  const email = `photo-test-${Date.now()}@example.com`;
  let accessToken = "";
  let userId = "";

  beforeAll(async () => {
    admin = createClient(url!, serviceRoleKey!, { auth: { persistSession: false } });
    visitor = createClient(url!, anonKey!, { auth: { persistSession: false } });

    // Stands in for the visitor's inbox: mint the same OTP Supabase would email.
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    expect(error).toBeNull();

    const otp = data?.properties?.email_otp;
    expect(otp).toBeTruthy();

    const verified = await visitor.auth.verifyOtp({ email, token: otp!, type: "email" });
    expect(verified.error).toBeNull();

    accessToken = verified.data.session!.access_token;
    userId = verified.data.user!.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("refuses an anonymous request for a photo", async () => {
    const response = await fetch(photoEndpoint(photoPath));
    expect(response.status).toBe(401);
  });

  it("refuses the anon key as a credential", async () => {
    const response = await fetch(photoEndpoint(photoPath), {
      headers: { Authorization: `Bearer ${anonKey}` },
    });
    expect(response.status).toBe(401);
  });

  it("refuses a forged or malformed token", async () => {
    const response = await fetch(photoEndpoint(photoPath), {
      headers: { Authorization: "Bearer not.a.real.token" },
    });
    expect(response.status).toBe(401);
  });

  it("serves the photo to a verified session and marks it uncacheable", async () => {
    const response = await fetch(photoEndpoint(photoPath), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\//);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects path traversal and unknown galleries even for a verified session", async () => {
    for (const attempt of [
      "wedding/../../etc/passwd",
      "../protected-photos/wedding/primephoto-24.JPG",
      "secrets/anything.jpg",
      "wedding/photo.svg",
    ]) {
      const response = await fetch(photoEndpoint(attempt), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(response.status).toBe(404);
    }
  });

  it("keeps the bucket private from anonymous and verified visitors alike", async () => {
    const publicUrl = `${url}/storage/v1/object/public/${bucket}/${photoPath}`;
    expect((await fetch(publicUrl)).ok).toBe(false);

    const authenticatedUrl = `${url}/storage/v1/object/${bucket}/${photoPath}`;
    const direct = await fetch(authenticatedUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey! },
    });
    expect(direct.ok).toBe(false);

    const viaClient = await visitor.storage.from(bucket).download(photoPath);
    expect(viaClient.error).not.toBeNull();

    const signed = await visitor.storage.from(bucket).createSignedUrl(photoPath, 60);
    expect(signed.error).not.toBeNull();
  });

  it("denies a signed-out session at the backend", async () => {
    const throwaway = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const throwawayEmail = `photo-test-out-${Date.now()}@example.com`;

    const { data } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: throwawayEmail,
    });
    const verified = await throwaway.auth.verifyOtp({
      email: throwawayEmail,
      token: data!.properties!.email_otp!,
      type: "email",
    });
    const token = verified.data.session!.access_token;

    expect(
      (await fetch(photoEndpoint(photoPath), { headers: { Authorization: `Bearer ${token}` } }))
        .status,
    ).toBe(200);

    await throwaway.auth.signOut();

    const afterSignOut = await fetch(photoEndpoint(photoPath), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(afterSignOut.status).toBe(401);

    await admin.auth.admin.deleteUser(verified.data.user!.id);
  });

  it("rejects an already-used one-time code", async () => {
    const reuseEmail = `photo-test-reuse-${Date.now()}@example.com`;
    const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email: reuseEmail });
    const otp = data!.properties!.email_otp!;

    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const first = await client.auth.verifyOtp({ email: reuseEmail, token: otp, type: "email" });
    expect(first.error).toBeNull();

    const second = await client.auth.verifyOtp({ email: reuseEmail, token: otp, type: "email" });
    expect(second.error).not.toBeNull();

    await admin.auth.admin.deleteUser(first.data.user!.id);
  });

  it("rejects a code that was never issued", async () => {
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const result = await client.auth.verifyOtp({
      email: `photo-test-none-${Date.now()}@example.com`,
      token: "000000",
      type: "email",
    });
    expect(result.error).not.toBeNull();
  });

  it("keeps access records unreadable and unforgeable by visitors", async () => {
    // The private schema is not exposed through PostgREST at all.
    for (const table of ["photo_access_log", "auth_event_log", "photo_access_notification"]) {
      const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey! },
      });
      expect(response.ok).toBe(false);
    }

    // And the writer functions are service_role only.
    const forge = await visitor.rpc("record_photo_access", {
      p_user_id: userId,
      p_session_id: null,
      p_gallery: "wedding",
      p_photo_path: "wedding/fake.jpg",
      p_event_type: "photo_request",
      p_outcome: "allowed",
    });
    expect(forge.error).not.toBeNull();

    const claim = await visitor.rpc("claim_photo_access_notification", {
      p_user_id: userId,
      p_dedup_key: "forged",
    });
    expect(claim.error).not.toBeNull();
  });

  it("de-duplicates the owner notification within a session", async () => {
    const dedupKey = `session:test-${Date.now()}`;

    const first = await admin.rpc("claim_photo_access_notification", {
      p_user_id: userId,
      p_dedup_key: dedupKey,
    });
    const second = await admin.rpc("claim_photo_access_notification", {
      p_user_id: userId,
      p_dedup_key: dedupKey,
    });

    expect(first.data?.[0]?.should_notify).toBe(true);
    expect(second.data?.[0]?.should_notify).toBe(false);
    // The email comes from the database, never from the caller.
    expect(first.data?.[0]?.email).toBe(email);
  });
});
