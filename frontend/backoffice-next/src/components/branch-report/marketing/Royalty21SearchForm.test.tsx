import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";

import { MAX_REG_DATE_RANGE_DAYS } from "@/lib/branch-report/royalty21DateRange";

import Royalty21SearchForm from "./Royalty21SearchForm";

const emptySecondary = {
  inviteLinkOptions: [] as { value: string; label: string }[],
  inviteLinksLoading: false,
};

describe("Royalty21SearchForm", () => {
  it("shows validation when affiliate channel selected without invite link", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<Royalty21SearchForm {...emptySecondary} onSearch={onSearch} onClear={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Please select affiliate link")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows validation when member referral selected without referring member", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <Royalty21SearchForm
        {...emptySecondary}
        initialValues={{ channelType: "member_referral" }}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Enter the referring member’s exact username")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows referring member text field for member_referral", () => {
    render(
      <Royalty21SearchForm
        {...emptySecondary}
        initialValues={{ channelType: "member_referral" }}
        onSearch={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: /referring member/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Exact username")).toBeInTheDocument();
    expect(screen.getByText("Exact match only")).toHaveClass("sr-only");
    expect(screen.queryByRole("combobox", { name: /affiliate link/i })).not.toBeInTheDocument();
  });

  it("hides secondary field for direct channel", () => {
    render(
      <Royalty21SearchForm
        {...emptySecondary}
        initialValues={{ channelType: "direct" }}
        onSearch={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole("combobox", { name: /affiliate link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /referring member/i })).not.toBeInTheDocument();
  });

  it("submits exact referralUsername for member_referral", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <Royalty21SearchForm
        {...emptySecondary}
        initialValues={{ channelType: "member_referral" }}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: /referring member/i }), "  REFERRER01  ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
      }),
    );
  });

  it("shows validation when register range end is before start (AC-10)", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(
      <Royalty21SearchForm
        {...emptySecondary}
        inviteLinkOptions={[{ value: "link-1", label: "Test Link" }]}
        initialValues={{
          channelType: "member_referral",
          referralUsername: "REFERRER01",
          regDateRange: [dayjs("2024-06-01"), dayjs("2024-05-01")],
        }}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Register to must be on or after Register from")).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows validation when register range exceeds 366 days", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const from = dayjs("2024-01-01");
    const to = from.add(MAX_REG_DATE_RANGE_DAYS, "day");

    render(
      <Royalty21SearchForm
        {...emptySecondary}
        inviteLinkOptions={[{ value: "link-1", label: "Test Link" }]}
        initialValues={{
          channelType: "member_referral",
          referralUsername: "REFERRER01",
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
