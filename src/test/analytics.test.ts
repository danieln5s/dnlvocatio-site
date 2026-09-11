import { beforeEach, describe, expect, it, vi } from "vitest";

import { event, pageview, sanitizeParams, sanitizePath } from "@/lib/ga";
import { readConsent, setConsent } from "@/lib/consent";

describe("analytics consent", () => {
  let gtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtag = vi.fn();
    window.gtag = gtag as unknown as typeof window.gtag;
    window.localStorage.clear();
  });

  it("sends nothing before a choice is made", () => {
    expect(readConsent()).toBeNull();
    pageview("/journal");
    event("view_gallery", { gallery: "wedding" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends nothing when analytics are declined", () => {
    setConsent("denied");
    gtag.mockClear();

    pageview("/journal");
    event("view_gallery", { gallery: "wedding" });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends page views once analytics are allowed", () => {
    setConsent("granted");
    gtag.mockClear();

    pageview("/journal/wedding");

    expect(gtag).toHaveBeenCalledWith("config", "G-QTLPC7Z0BL", {
      page_path: "/journal/wedding",
    });
  });

  it("mirrors the choice into Consent Mode without granting ad storage", () => {
    setConsent("granted");
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });
});

describe("analytics payload scrubbing", () => {
  it("strips identity, credentials and private image references", () => {
    expect(
      sanitizeParams({
        email: "visitor@example.com",
        otp_code: "123456",
        access_token: "ey.jwt.value",
        photo_path: "wedding/primephoto-24.JPG",
        image_url: "blob:http://localhost/abc",
        owner: "someone@example.com",
        session: { id: 1 },
        gallery_size: 14,
      }),
    ).toEqual({ gallery_size: 14 });
  });

  it("removes query strings and fragments from paths", () => {
    expect(sanitizePath("/journal/wedding?token=abc#code=123456")).toBe("/journal/wedding");
    expect(sanitizePath("")).toBe("/");
  });

  it("never forwards a scrubbed key to gtag", () => {
    const gtag = vi.fn();
    window.gtag = gtag as unknown as typeof window.gtag;
    setConsent("granted");
    gtag.mockClear();

    event("photo_viewed", { email: "a@b.com", gallery_size: 3 });

    expect(gtag).toHaveBeenCalledWith("event", "photo_viewed", { gallery_size: 3 });
  });
});
