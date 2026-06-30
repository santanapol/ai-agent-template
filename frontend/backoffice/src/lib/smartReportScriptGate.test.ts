import { describe, expect, it } from 'vitest';
import { canSaveScript, scriptRequiresGate } from './smartReportScriptGate';

describe('smartReportScriptGate', () => {
  describe('scriptRequiresGate', () => {
    it('requires gate for new reports', () => {
      expect(scriptRequiresGate(null, null, 'db.col.find({});')).toBe(true);
    });

    it('does not require gate when script matches baseline', () => {
      const script = 'db.col.find({});';
      expect(scriptRequiresGate({ id: '1' }, script, script)).toBe(false);
    });

    it('requires gate when script diverges from baseline', () => {
      expect(scriptRequiresGate({ id: '1' }, 'db.col.find({});', 'db.col.aggregate([]);')).toBe(
        true,
      );
    });
  });

  describe('canSaveScript', () => {
    it('allows save when gate is not required', () => {
      expect(canSaveScript(false, 'pending', null, null)).toBe(true);
    });

    it('blocks save until validate and test run complete', () => {
      expect(canSaveScript(true, 'pending', null, null)).toBe(false);
      expect(canSaveScript(true, 'validated', null, 'withReport(async () => {});')).toBe(false);
    });

    it('allows save after successful test run', () => {
      expect(
        canSaveScript(true, 'tested', 'token', 'withReport(async () => { return []; });'),
      ).toBe(true);
    });
  });
});
