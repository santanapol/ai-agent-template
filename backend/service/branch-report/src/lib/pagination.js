export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * @param {{ page?: unknown; pageSize?: unknown }} input
 * @returns {{ page: number; pageSize: number }}
 */
export function normalizePagination(input = {}) {
  let page = toPositiveInteger(input.page, DEFAULT_PAGE);
  let pageSize = toPositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE);

  if (page < 1) {
    page = DEFAULT_PAGE;
  }

  if (pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE;
  }

  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  return { page, pageSize };
}

/**
 * @param {number} page
 * @param {number} pageSize
 * @returns {number}
 */
export function paginationSkip(page, pageSize) {
  return (page - 1) * pageSize;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.floor(parsed);
}
