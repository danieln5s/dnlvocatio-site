import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  isPhotoAccessConfigured: true,
  supabase: null,
  functionsUrl: () => "https://project.supabase.co/functions/v1",
}));

import {
  PhotoAccessError,
  clearProtectedPhotoCache,
  getCachedPhotoUrl,
  loadProtectedPhoto,
} from "@/lib/protectedPhotos";

const okResponse = () =>
  new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), { status: 200 });

describe("loadProtectedPhoto", () => {
  beforeEach(() => {
    clearProtectedPhotoCache();
    vi.restoreAllMocks();
  });

  it("authenticates with a session token in the Authorization header", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await loadProtectedPhoto("wedding/primephoto-24.JPG", "token-abc");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.headers).toEqual({ Authorization: "Bearer token-abc" });
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("omit");

    // The token must never be reachable from a copyable URL.
    expect(url).not.toContain("token-abc");
    expect(url).toBe(
      "https://project.supabase.co/functions/v1/photo?path=wedding%2Fprimephoto-24.JPG",
    );
  });

  it("surfaces the backend status when access is refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));

    await expect(loadProtectedPhoto("wedding/a.jpg", "expired")).rejects.toBeInstanceOf(
      PhotoAccessError,
    );

    try {
      await loadProtectedPhoto("wedding/a.jpg", "expired");
    } catch (error) {
      expect((error as PhotoAccessError).status).toBe(401);
    }

    expect(getCachedPhotoUrl("wedding/a.jpg")).toBeUndefined();
  });

  it("reuses a single request for concurrent callers and caches the result", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      loadProtectedPhoto("travel/flex.jpg", "token"),
      loadProtectedPhoto("travel/flex.jpg", "token"),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadProtectedPhoto("travel/flex.jpg", "token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("drops all private image data on sign-out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse()));
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    await loadProtectedPhoto("fishing/fish_ring.jpg", "token");
    expect(getCachedPhotoUrl("fishing/fish_ring.jpg")).toBeDefined();

    clearProtectedPhotoCache();

    expect(revoke).toHaveBeenCalled();
    expect(getCachedPhotoUrl("fishing/fish_ring.jpg")).toBeUndefined();
  });

  it("refuses to build a request when delivery is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const module = await import("@/lib/supabaseClient");
    vi.spyOn(module, "functionsUrl").mockReturnValue("");

    await expect(loadProtectedPhoto("wedding/b.jpg", "token")).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
