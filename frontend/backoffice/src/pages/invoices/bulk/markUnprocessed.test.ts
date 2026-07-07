import { describe, expect, it } from 'vitest';
import { failedResultIds, markUnprocessedAsCancelled } from './markUnprocessed';

describe('markUnprocessedAsCancelled', () => {
  it('adds cancelled rows for ids missing from results', () => {
    const additions = markUnprocessedAsCancelled(
      ['inv1', 'inv2', 'inv3'],
      [{ id: 'inv1', ivNo: 'IV-1', status: 'success' }],
    );

    expect(additions).toEqual([
      { id: 'inv2', ivNo: 'inv2', status: 'cancelled' },
      { id: 'inv3', ivNo: 'inv3', status: 'cancelled' },
    ]);
  });
});

describe('failedResultIds', () => {
  it('returns only failed ids for retry', () => {
    expect(
      failedResultIds([
        { id: 'inv1', ivNo: 'IV-1', status: 'success' },
        { id: 'inv2', ivNo: 'IV-2', status: 'failed', error: 'boom' },
        { id: 'inv3', ivNo: 'IV-3', status: 'cancelled' },
      ]),
    ).toEqual(['inv2']);
  });
});
