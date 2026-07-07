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
