import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  paginationSkip,
} from './pagination.js';

describe('normalizePagination', () => {
  it('applies defaults when page and pageSize are missing', () => {
    assert.deepEqual(normalizePagination({}), {
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('clamps page below 1 to 1 and pageSize above max to 100', () => {
    assert.deepEqual(normalizePagination({ page: 0, pageSize: 200 }), {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
  });

  it('floors fractional page and pageSize values', () => {
    assert.deepEqual(normalizePagination({ page: 2.9, pageSize: 49.1 }), {
      page: 2,
      pageSize: 49,
    });
  });

  it('uses default pageSize when pageSize is invalid', () => {
    assert.deepEqual(normalizePagination({ page: 3, pageSize: 0 }), {
      page: 3,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });
});

describe('paginationSkip', () => {
  it('returns zero-based skip for page and pageSize', () => {
    assert.equal(paginationSkip(1, 50), 0);
    assert.equal(paginationSkip(2, 50), 50);
    assert.equal(paginationSkip(3, 20), 40);
  });
});
