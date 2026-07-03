import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useInvoiceListFilters } from './useInvoiceListFilters';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/invoices?search=INV-1&page=2']}>{children}</MemoryRouter>;
}

describe('useInvoiceListFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes from URL search params', () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });
    expect(result.current.searchText).toBe('INV-1');
    expect(result.current.page).toBe(2);
  });

  it('debounces search text before exposing debouncedSearchText', () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });

    act(() => {
      result.current.setSearchText('INV-999');
    });
    expect(result.current.debouncedSearchText).toBe('INV-1');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.debouncedSearchText).toBe('INV-999');
  });

  it('syncs branch_id=all to URL when branch filter cleared', () => {
    const { result } = renderHook(() => useInvoiceListFilters(), { wrapper });

    act(() => {
      result.current.setSelectedBranchId(undefined);
    });

    expect(result.current.searchParams.get('branch_id')).toBe('all');
  });
});
