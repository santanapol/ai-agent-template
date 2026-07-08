/** Billin, Withdraw, Revenue — always 2 decimal places. */
export function formatSummary(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Deposit columns 1–21: zero displays as dash. */
export function formatDeposit(value: number): string {
  if (value === 0) return "-";
  return formatSummary(value);
}

/** Promotion phase 1: always dash (API value ignored). */
export function formatPromotion(): string {
  return "-";
}
