import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const isBrowserLike = typeof window !== "undefined";

afterEach(() => {
  if (!isBrowserLike) return;
  cleanup();
  window.localStorage.clear();
});

// --- jsdom gaps used by the components under test -------------------------
// Assigned directly rather than via vi.stubGlobal so `unstubGlobals` does not
// remove them between tests: this file runs once per test file, not per test.

if (isBrowserLike) {
  if (!("IntersectionObserver" in window)) {
    class StubIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: readonly number[] = [];

      constructor(private readonly callback: IntersectionObserverCallback) {}

      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    globalThis.IntersectionObserver =
      StubIntersectionObserver as unknown as typeof IntersectionObserver;
  }

  if (typeof URL.createObjectURL !== "function") {
    let counter = 0;
    URL.createObjectURL = () => `blob:test/${++counter}`;
    URL.revokeObjectURL = () => undefined;
  }

  // Radix primitives touch these; jsdom does not implement them.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
}
