export function buildInvoiceEtag(updDate?: string): string | undefined {
  return updDate ? `W/"${btoa(updDate)}"` : undefined;
}
