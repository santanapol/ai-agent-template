import { generateETag } from '../../src/utils/etag.js';

describe('generateETag', () => {
  it('returns a weak ETag encoded from upd_date', () => {
    const updDate = new Date('2026-05-27T10:00:00.000Z');
    const etag = generateETag(updDate);

    expect(etag).toMatch(/^W\/"/);
    expect(etag).toContain(Buffer.from(updDate.toISOString()).toString('base64'));
  });
});
