import { ZERO_HQ_BRANCH_ID } from '../../config/platform-branches.js'

function branchLabel(branch) {
  return `${branch.branch_code ?? ''} ${branch.branch_name ?? ''}`.trim()
}

/**
 * @param {Array<{ branch_id: string, branch_code: string | null, branch_name: string | null, active: boolean }>} branches
 */
export function sortBranchDisplayList(branches) {
  const hq = branches.find((branch) => branch.branch_id === ZERO_HQ_BRANCH_ID)
  const rest = branches.filter((branch) => branch.branch_id !== ZERO_HQ_BRANCH_ID)
  rest.sort((a, b) => {
    const aInactive = a.active === false ? 1 : 0
    const bInactive = b.active === false ? 1 : 0
    if (aInactive !== bInactive) return aInactive - bInactive
    return branchLabel(a).localeCompare(branchLabel(b), 'th')
  })
  return hq ? [hq, ...rest] : rest
}

const BRANCH_LIST_LIMIT_MAX = 100

/**
 * Case-insensitive match on branch_code or branch_name.
 * @param {{ branch_code: string | null, branch_name: string | null }} branch
 * @param {string} q
 */
export function branchMatchesQuery(branch, q) {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const code = (branch.branch_code ?? '').toLowerCase()
  const name = (branch.branch_name ?? '').toLowerCase()
  return code.includes(needle) || name.includes(needle)
}

/**
 * Optional typeahead filter + cap. Omitting `limit` preserves full list (backward compatible).
 * @param {Array<{ branch_id: string, branch_code: string | null, branch_name: string | null, active: boolean }>} branches
 * @param {{ q?: string, limit?: number }} [options]
 */
export function applyBranchListQuery(branches, { q, limit } = {}) {
  let result = branches
  if (typeof q === 'string' && q.trim()) {
    result = result.filter((branch) => branchMatchesQuery(branch, q))
  }
  if (limit !== undefined && limit !== null) {
    const cap = Math.min(Math.max(1, Number(limit)), BRANCH_LIST_LIMIT_MAX)
    result = result.slice(0, cap)
  }
  return result
}
