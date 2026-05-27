import { buildAuditCreate } from '../../src/utils/audit.js';

describe('buildAuditCreate', () => {
  it('sets cr and upd fields to the same values on create', () => {
    const audit = buildAuditCreate({
      userId: 'user-001',
      prog: 'POST /api/v1/items',
    });

    expect(audit.cr_by).toBe('user-001');
    expect(audit.upd_by).toBe('user-001');
    expect(audit.cr_prog).toBe('POST /api/v1/items');
    expect(audit.upd_prog).toBe('POST /api/v1/items');
    expect(audit.cr_date).toBeInstanceOf(Date);
    expect(audit.upd_date).toEqual(audit.cr_date);
  });
});
