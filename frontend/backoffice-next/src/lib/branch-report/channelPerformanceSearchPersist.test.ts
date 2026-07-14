import { describe, expect, it } from "vitest";

import { paramsForBranchSwitchRefetch } from "./channelPerformanceSearchPersist";

describe("paramsForBranchSwitchRefetch", () => {
  it("resets page and keeps invite link for non-affiliate channels", () => {
    expect(
      paramsForBranchSwitchRefetch({
        channelType: "direct",
        regDateFrom: "2026-07-01",
        regDateTo: "2026-07-31",
        page: 3,
        pageSize: 50,
      }),
    ).toEqual({
      channelType: "direct",
      regDateFrom: "2026-07-01",
      regDateTo: "2026-07-31",
      page: 1,
      pageSize: 50,
    });
  });

  it("drops invite link for affiliate channel after branch switch", () => {
    expect(
      paramsForBranchSwitchRefetch({
        channelType: "affiliate_link",
        inviteLinkId: "old-branch-link",
        regDateFrom: "2026-07-01",
        regDateTo: "2026-07-31",
        page: 2,
        pageSize: 25,
      }),
    ).toEqual({
      channelType: "affiliate_link",
      regDateFrom: "2026-07-01",
      regDateTo: "2026-07-31",
      page: 1,
      pageSize: 25,
    });
  });

  it("keeps referralUsername for member_referral after branch switch", () => {
    expect(
      paramsForBranchSwitchRefetch({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2026-07-01",
        regDateTo: "2026-07-31",
        page: 2,
        pageSize: 25,
      }),
    ).toEqual({
      channelType: "member_referral",
      referralUsername: "REFERRER01",
      regDateFrom: "2026-07-01",
      regDateTo: "2026-07-31",
      page: 1,
      pageSize: 25,
    });
  });
});
