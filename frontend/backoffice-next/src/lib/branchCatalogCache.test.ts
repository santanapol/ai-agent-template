import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authBranchToInvoiceBranch,
  branchCatalogCacheKey,
  clearBranchCatalogCacheForTests,
  getBranchCatalog,
  invalidateBranchCatalog,
  peekBranchCatalog,
} from "./branchCatalogCache";

describe("branchCatalogCache", () => {
  beforeEach(() => {
    clearBranchCatalogCacheForTests();
  });

  it("dedupes concurrent fetches for the same cache key", async () => {
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<{ branch_id: string; branch_code: string | null; branch_name: string | null; active: boolean }[]>(
          (resolve) => {
            setTimeout(
              () => resolve([{ branch_id: "b1", branch_code: "HQ", branch_name: "HQ", active: true }]),
              10,
            );
          },
        ),
    );

    const key = branchCatalogCacheKey("ou1", "auth");
    const [a, b] = await Promise.all([getBranchCatalog(key, fetcher), getBranchCatalog(key, fetcher)]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("peeks cached branches without fetching (FE-REV-008)", async () => {
    const key = branchCatalogCacheKey("ou1", "auth");
    expect(peekBranchCatalog(key)).toBeNull();

    await getBranchCatalog(key, async () => [
      { branch_id: "b1", branch_code: "HQ", branch_name: "HQ", active: true },
    ]);

    expect(peekBranchCatalog(key)).toEqual([
      { branch_id: "b1", branch_code: "HQ", branch_name: "HQ", active: true },
    ]);
  });

  it("invalidates cache on branch switch helper", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([{ branch_id: "b1", branch_code: "A", branch_name: "A", active: true }])
      .mockResolvedValueOnce([{ branch_id: "b2", branch_code: "B", branch_name: "B", active: true }]);

    const key = branchCatalogCacheKey("ou1", "auth");
    await getBranchCatalog(key, fetcher);
    invalidateBranchCatalog("ou1");
    const next = await getBranchCatalog(key, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(next[0]?.branch_id).toBe("b2");
  });

  it("invalidates switcher typeahead keys without false-matching other OUs", async () => {
    const fetcherOu1 = vi.fn().mockResolvedValue([{ branch_id: "b1", branch_code: "A", branch_name: "A", active: true }]);
    const fetcherOu2 = vi.fn().mockResolvedValue([{ branch_id: "b2", branch_code: "B", branch_name: "B", active: true }]);

    const switcherKey = `${branchCatalogCacheKey("ou1", "auth")}:77`;
    const otherOuKey = branchCatalogCacheKey("ou177", "auth");
    await getBranchCatalog(switcherKey, fetcherOu1);
    await getBranchCatalog(otherOuKey, fetcherOu2);

    invalidateBranchCatalog("ou1");

    await getBranchCatalog(switcherKey, fetcherOu1);
    await getBranchCatalog(otherOuKey, fetcherOu2);

    expect(fetcherOu1).toHaveBeenCalledTimes(2);
    expect(fetcherOu2).toHaveBeenCalledTimes(1);
  });

  it("maps auth branch shape to invoice dropdown shape", () => {
    expect(
      authBranchToInvoiceBranch({
        branch_id: "abc",
        branch_code: "77",
        branch_name: "777WW",
        active: true,
      }),
    ).toEqual({
      branch_id: "abc",
      branch_code: "77",
      branch_name: "777WW",
      active: true,
    });
  });
});
