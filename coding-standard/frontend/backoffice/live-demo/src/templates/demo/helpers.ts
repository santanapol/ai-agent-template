export const getInvoiceStatusColor = (status: string) => {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'ERROR') return 'error';
  if (status === 'READY') return 'processing';
  return 'default';
};

export const getAgentStatusColor = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  if (status === 'INACTIVE') return 'default';
  return 'default';
};

export const getReportStatusColor = (status: string) => {
  if (status === 'COMPLETED') return 'success';
  if (status === 'PROCESSING') return 'processing';
  if (status === 'FAILED') return 'error';
  return 'default';
};

export const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return '-';
  return `฿${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatNumber = (val: number | null | undefined) => {
  if (val == null) return '-';
  return val.toLocaleString('en-US');
};

/** Statistic formatter for currency values (no prefix — use suffix="THB" on Statistic). */
export const statisticNumberFormatter = (value: number | string) =>
  Number(value).toLocaleString('en-US');

/** Statistic formatter that preserves decimal precision for rates. */
export const statisticRateFormatter = (value: number | string) =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
