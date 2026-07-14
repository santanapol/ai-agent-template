/** Deposit matrix count cells — integer with grouping, keep zeros visible. */
export function formatMatrixCount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

/** Deposit matrix percent cells — always two decimals + %. */
export function formatMatrixPercent(value: number): string {
  return `${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}
