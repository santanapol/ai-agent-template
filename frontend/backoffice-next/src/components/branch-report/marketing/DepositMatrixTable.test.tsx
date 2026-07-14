import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatMatrixCount, formatMatrixPercent } from "@/lib/branch-report/depositMatrixFormatters";
import type { DepositMatrixData } from "@/types/branchReport";

import DepositMatrixTable from "./DepositMatrixTable";

const sampleMatrix: DepositMatrixData = {
  buckets: [
    { key: "0-99", label: "0 - 99", min: 0, max: 99 },
    { key: "100-199", label: "100 - 199", min: 100, max: 199 },
  ],
  rounds: 21,
  counts: [
    [2, 0, ...Array(19).fill(0)],
    [1, 3, ...Array(19).fill(0)],
  ],
  rowSums: [2, 4],
  percents: [
    [66.67, 0, ...Array(19).fill(0)],
    [33.33, 100, ...Array(19).fill(0)],
  ],
  percentRowSums: [33.33, 66.67],
};

describe("depositMatrixFormatters", () => {
  it("formats counts as integers with grouping", () => {
    expect(formatMatrixCount(3763)).toBe("3,763");
    expect(formatMatrixCount(0)).toBe("0");
  });

  it("formats percents with two decimals and percent sign", () => {
    expect(formatMatrixPercent(66.67)).toBe("66.67%");
    expect(formatMatrixPercent(0)).toBe("0.00%");
  });
});

describe("DepositMatrixTable", () => {
  it("shows pre-search empty state before first search", () => {
    render(<DepositMatrixTable mode="count" data={null} hasSearched={false} />);

    expect(screen.getByText("Run Search to load report")).toBeInTheDocument();
  });

  it("renders Rank, rounds 1–21, SUM, and count cells", () => {
    render(<DepositMatrixTable mode="count" data={sampleMatrix} hasSearched />);

    expect(screen.getByRole("columnheader", { name: "Rank" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SUM" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "21" })).toBeInTheDocument();
    expect(screen.getByText("0 - 99")).toBeInTheDocument();
    expect(screen.getByText("100 - 199")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "4" })).toBeInTheDocument();
  });

  it("renders percent mode with xx.xx% values", () => {
    render(<DepositMatrixTable mode="percent" data={sampleMatrix} hasSearched />);

    expect(screen.getAllByText("66.67%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("33.33%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("100.00%")).toBeInTheDocument();
  });
});
