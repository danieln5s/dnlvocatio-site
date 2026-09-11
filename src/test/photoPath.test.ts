import { describe, expect, it } from "vitest";

import {
  PROTECTED_GALLERIES,
  contentTypeForPath,
  parsePhotoPath,
} from "../../supabase/functions/_shared/photoPath";

describe("parsePhotoPath", () => {
  it("accepts a well-formed object path in a known gallery", () => {
    expect(parsePhotoPath("wedding/primephoto-175.JPG")).toEqual({
      gallery: "wedding",
      path: "wedding/primephoto-175.JPG",
    });
  });

  it("accepts every configured gallery", () => {
    for (const gallery of PROTECTED_GALLERIES) {
      expect(parsePhotoPath(`${gallery}/photo.jpg`)?.gallery).toBe(gallery);
    }
  });

  it.each([
    ["empty", ""],
    ["missing", null],
    ["unknown gallery", "secrets/photo.jpg"],
    ["parent traversal", "wedding/../../etc/passwd"],
    ["dot segment", "wedding/..%2fsecret.jpg"],
    ["percent encoded separator", "wedding%2Fphoto.jpg"],
    ["absolute path", "/wedding/photo.jpg"],
    ["backslash", "wedding\\photo.jpg"],
    ["nested folder", "wedding/2026/photo.jpg"],
    ["null byte", "wedding/photo.jpg\u0000.txt"],
    ["non-image extension", "wedding/photo.svg"],
    ["executable extension", "wedding/photo.js"],
    ["no extension", "wedding/photo"],
    ["bare gallery", "wedding/"],
    ["trailing slash", "wedding/photo.jpg/"],
    ["overlong", `wedding/${"a".repeat(200)}.jpg`],
  ])("rejects %s", (_label, value) => {
    expect(parsePhotoPath(value as string)).toBeNull();
  });

  it("does not infer a content type that could be rendered as markup", () => {
    expect(contentTypeForPath("wedding/photo.JPG")).toBe("image/jpeg");
    expect(contentTypeForPath("wedding/photo.svg")).toBe("application/octet-stream");
  });
});
