import { toBranchDisplay } from './branch-display.js'

/**
 * Resolves branch access for active-branch switch:
 * 1. platform_branches (zero-platform SoT — e.g. Zero HQ)
 * 2. gpp_777ww.su_branch via BranchReadRepository (customer branches)
 */
export class BranchAccessResolver {
  /**
   * @param {{
   *   platformBranchRepo?: import('./platform-branch.repository.js').PlatformBranchRepository | null
   *   branchReadRepo?: import('./branch-read.repository.js').BranchReadRepository | null
   * }} p
   */
  constructor({ platformBranchRepo = null, branchReadRepo = null } = {}) {
    this.platformBranchRepo = platformBranchRepo
    this.branchReadRepo = branchReadRepo
  }

  isConfigured() {
    return Boolean(this.platformBranchRepo || this.branchReadRepo)
  }

  /**
   * @returns {Promise<'not_found' | 'forbidden' | 'inactive' | 'ok'>}
   */
  async resolveBranchAccess(branchId, ouId) {
    if (this.platformBranchRepo) {
      const platformResult = await this.platformBranchRepo.resolveBranchAccess(branchId, ouId)
      if (platformResult !== 'not_found') return platformResult
    }
    if (this.branchReadRepo) {
      return this.branchReadRepo.resolveBranchAccess(branchId, ouId)
    }
    return 'not_found'
  }

  /**
   * Branch metadata for header labels — same sources as access checks.
   * @returns {Promise<ReturnType<typeof toBranchDisplay>>}
   */
  async findBranchDisplay(branchId, ouId) {
    if (this.platformBranchRepo) {
      const doc = await this.platformBranchRepo.findByIdInOu(branchId, ouId)
      const display = toBranchDisplay(doc)
      if (display) return display
    }
    if (this.branchReadRepo) {
      const doc = await this.branchReadRepo.findByIdInOu(branchId, ouId)
      return toBranchDisplay(doc)
    }
    return null
  }
}
