import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryRouter, useNavigate } from "@/navigation/compat";
import { testNavigation } from "@/test/mockNavigation";

import { useInvoiceListFilters } from "./useInvoiceListFilters";

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/invoices?search=INV-1&page=2"]}>{children}</MemoryRouter>;
}

describe("useInvoiceListFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testNavigation.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes from URL search params", () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });
    expect(result.current.searchText).toBe("INV-1");
    expect(result.current.page).toBe(2);
  });

  it("debounces search text before exposing debouncedSearchText", () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });

    act(() => {
      result.current.setSearchText("INV-999");
    });
    expect(result.current.debouncedSearchText).toBe("INV-1");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.debouncedSearchText).toBe("INV-999");
  });

  it("syncs branch_id=all to URL when branch filter cleared", () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });

    act(() => {
      result.current.setSelectedBranchId(undefined);
    });

    expect(result.current.searchParams.get("branch_id")).toBe("all");
  });

  it("does not replace URL when filters already match search params", () => {
    renderHook(() => useInvoiceListFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/invoices?branch_id=all&billing_month=2026-07"]}>{children}</MemoryRouter>
      ),
    });

    expect(testNavigation.replace).not.toHaveBeenCalled();
  });

  it("hydrates state immediately when URL changes externally", () => {
    let navigate: ReturnType<typeof useNavigate> | null = null;

    function NavigationBridge() {
      navigate = useNavigate();
      return null;
    }

    const { result } = renderHook(() => useInvoiceListFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/invoices?search=INV-1&page=2&branch_id=all&billing_month=2026-07"]}>
          <NavigationBridge />
          {children}
        </MemoryRouter>
      ),
    });

    act(() => {
      navigate?.("/invoices?search=INV-2&page=3&branch_id=all&billing_month=2026-07", { replace: true });
    });

    expect(result.current.searchText).toBe("INV-2");
    expect(result.current.debouncedSearchText).toBe("INV-2");
    expect(result.current.page).toBe(3);
  });
});
