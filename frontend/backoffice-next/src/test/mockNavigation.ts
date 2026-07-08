import { vi } from "vitest";

/** Shared Next.js router spies (used when not inside MemoryRouter). */
export const mockNextRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export type TestNavigationSpy = {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  reset: () => void;
};

/** MemoryRouter navigation spies — registered from compat via global to avoid import cycles. */
export const testNavigation: TestNavigationSpy = {
  push: vi.fn(),
  replace: vi.fn(),
  reset() {
    mockNextRouter.push.mockClear();
    mockNextRouter.replace.mockClear();
    this.push.mockClear();
    this.replace.mockClear();
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __ZERO_TEST_NAV__: TestNavigationSpy | undefined;
}

globalThis.__ZERO_TEST_NAV__ = testNavigation;
