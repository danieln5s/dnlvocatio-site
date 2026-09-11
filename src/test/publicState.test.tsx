import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  isPhotoAccessConfigured: true,
  supabase: null,
  functionsUrl: () => "https://project.supabase.co/functions/v1",
}));

import Journal from "@/pages/Journal";
import Life from "@/pages/Life";
import Wedding from "@/pages/Wedding";
import Cycling from "@/pages/hobbies/Cycling";
import Reading from "@/pages/hobbies/Reading";
import { clearProtectedPhotoCache } from "@/lib/protectedPhotos";
import { renderWithPhotoAccess, renderedImageSources } from "@/test/photoAccessHarness";

const PROTECTED_PATH = /wedding|cycling|fishing|reading|running|travel/i;

const pages = [
  ["Wedding gallery", <Wedding key="w" />],
  ["Journal", <Journal key="j" />],
  ["Life", <Life key="l" />],
  ["Cycling gallery", <Cycling key="c" />],
  ["Reading quotes", <Reading key="r" />],
] as const;

describe("public state", () => {
  it.each(pages)("%s renders no photographs for an unverified visitor", (_label, page) => {
    const { container } = renderWithPhotoAccess(page, { status: "public" });

    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(renderedImageSources(container)).toHaveLength(0);

    // Nothing in the markup points at a protected object either.
    const markup = container.innerHTML;
    expect(markup).not.toMatch(/src="[^"]*\.(jpe?g|png|webp|avif)"/i);
    expect(markup).not.toMatch(/background-image/i);
  });

  it.each(pages)("%s keeps its public text and offers a way in", (_label, page) => {
    renderWithPhotoAccess(page, { status: "public" });
    expect(screen.getAllByRole("button", { name: /view pictures/i }).length).toBeGreaterThan(0);
  });

  it("keeps the public copy and navigation intact", () => {
    renderWithPhotoAccess(<Wedding />, { status: "public" });

    expect(screen.getByRole("heading", { name: "The Wedding" })).toBeInTheDocument();
    expect(screen.getByText("New York, June 2026.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toBeInTheDocument();
  });

  it("still hides photographs while the session is being restored", () => {
    const { container } = renderWithPhotoAccess(<Wedding />, { status: "loading" });
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByText(/checking photo access/i)).toBeInTheDocument();
  });

  it("falls back to the public view when the backend is not configured", () => {
    const { container } = renderWithPhotoAccess(<Wedding />, { status: "unavailable" });
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByText(/not available right now/i)).toBeInTheDocument();
  });

  it("opens the verification flow from a placeholder", async () => {
    const openDialog = vi.fn();
    const { container } = renderWithPhotoAccess(<Wedding />, { status: "public", openDialog });

    const placeholders = container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label^="View pictures to see"]',
    );
    expect(placeholders.length).toBe(14);

    placeholders[0].click();
    expect(openDialog).toHaveBeenCalled();
  });
});

describe("verified state", () => {
  it("reveals the photographs in their existing locations", async () => {
    clearProtectedPhotoCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Blob([new Uint8Array([9])], { type: "image/jpeg" }), { status: 200 }),
      ),
    );

    const { container } = renderWithPhotoAccess(<Wedding />, {
      status: "verified",
      email: "visitor@example.com",
      getAccessToken: vi.fn(async () => "valid-token"),
    });

    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBe(14);
    });

    // Photos are delivered as in-memory blobs, never as public URLs.
    for (const source of renderedImageSources(container)) {
      expect(source.startsWith("blob:")).toBe(true);
    }

    expect(screen.getByText("visitor@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
