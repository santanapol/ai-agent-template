import { describe, expect, it } from 'vitest';
import {
  canCancelInvoice,
  canMarkInvoicePaid,
  ineligibleStatusMessage,
} from './utils';

describe('invoice status utils', () => {
  it('canMarkInvoicePaid allows only READY', () => {
    expect(canMarkInvoicePaid('READY')).toBe(true);
    expect(canMarkInvoicePaid('PAID')).toBe(false);
  });

  it('canCancelInvoice allows cancelable statuses', () => {
    expect(canCancelInvoice('READY')).toBe(true);
    expect(canCancelInvoice('PENDING')).toBe(true);
    expect(canCancelInvoice('MISSING_FEE')).toBe(true);
    expect(canCancelInvoice('ERROR')).toBe(true);
    expect(canCancelInvoice('PAID')).toBe(false);
    expect(canCancelInvoice('VOID')).toBe(false);
  });

  it('ineligibleStatusMessage explains the constraint', () => {
    expect(ineligibleStatusMessage('PAID', 'PENDING')).toContain('READY');
    expect(ineligibleStatusMessage('VOID', 'PAID')).toContain('Cannot cancel');
  });
});
