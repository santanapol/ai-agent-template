export function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseBillingMonth(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return undefined;
  return new Date(year, month - 1, 1);
}

export function toBillingMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayMonth(value: string): string {
  const date = parseBillingMonth(value);
  if (!date) return value;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
