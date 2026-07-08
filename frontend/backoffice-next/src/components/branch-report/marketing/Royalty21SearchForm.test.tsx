import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";

import { MAX_REG_DATE_RANGE_DAYS } from "@/lib/branch-report/royalty21DateRange";

import Royalty21SearchForm from "./Royalty21SearchForm";

describe("Royalty21SearchForm", () => {
  it("shows validation when affiliate channel selected without invite link", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <Royalty21SearchForm inviteLinkOptions={[]} inviteLinksLoading={false} onSearch={onSearch} onClear={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Please select affiliate link")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows validation when register range end is before start (AC-10)", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <Royalty21SearchForm
        inviteLinkOptions={[{ value: "link-1", label: "Test Link" }]}
        inviteLinksLoading={false}
        initialValues={{
          channelType: "member_referral",
          regDateRange: [dayjs("2024-06-01"), dayjs("2024-05-01")],
        }}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Register To must be on or after Register From")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows validation when register range exceeds 366 days", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const from = dayjs("2024-01-01");
    const to = from.add(MAX_REG_DATE_RANGE_DAYS, "day");

    render(
      <Royalty21SearchForm
        inviteLinkOptions={[{ value: "link-1", label: "Test Link" }]}
        inviteLinksLoading={false}
        initialValues={{
          channelType: "member_referral",
          regDateRange: [from, to],
        }}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText(`Register date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`),
    ).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
