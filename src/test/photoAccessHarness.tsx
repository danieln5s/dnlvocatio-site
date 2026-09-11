import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import {
  PhotoAccessContext,
  type PhotoAccessContextValue,
  type PhotoAccessStatus,
} from "@/context/photoAccessContext";

export const makePhotoAccessValue = (
  overrides: Partial<PhotoAccessContextValue> = {},
): PhotoAccessContextValue => ({
  status: "public" as PhotoAccessStatus,
  email: null,
  expiresAt: null,
  epoch: 0,
  isDialogOpen: false,
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
  getAccessToken: vi.fn(async () => null),
  requestCode: vi.fn(async () => undefined),
  verifyCode: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  ...overrides,
});

/** Renders UI with a fully controlled photo-access context (no backend). */
export const renderWithPhotoAccess = (
  ui: ReactNode,
  overrides: Partial<PhotoAccessContextValue> = {},
): RenderResult & { value: PhotoAccessContextValue } => {
  const value = makePhotoAccessValue(overrides);

  const result = render(
    <PhotoAccessContext.Provider value={value}>
      <MemoryRouter>{ui}</MemoryRouter>
    </PhotoAccessContext.Provider>,
  );

  return { ...result, value };
};

/** Collects every image URL the rendered DOM would actually fetch. */
export const renderedImageSources = (container: HTMLElement = document.body): string[] => {
  const sources: string[] = [];

  container.querySelectorAll("img").forEach((img) => {
    sources.push(img.getAttribute("src") ?? "");
  });
  container.querySelectorAll("source").forEach((source) => {
    sources.push(source.getAttribute("srcset") ?? "");
  });
  container.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const background = element.style.backgroundImage;
    if (background && background !== "none") sources.push(background);
  });

  return sources.filter(Boolean);
};
