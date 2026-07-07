import { ObjectId } from 'mongodb'
import { toBranchDisplay } from './branch-display.js'
import { sortBranchDisplayList } from './branch-display-sort.js'

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

  /**
   * Branches the caller may pick in the backoffice switcher (platform + customer master).
   * @param {import('mongodb').ObjectId} ouId
   * @param {{ ensureBranchIds?: string[] }} [options]
   */
  async listBranchesForOu(ouId, { ensureBranchIds = [] } = {}) {
    /** @type {Map<string, ReturnType<typeof toBranchDisplay>>} */
    const byId = new Map()

    if (this.platformBranchRepo) {
      const platformRows = await this.platformBranchRepo.findByOuId(ouId)
      for (const row of platformRows) {
        const display = toBranchDisplay(row)
        if (display) byId.set(display.branch_id, display)
      }
    }

    if (this.branchReadRepo) {
      const customerRows = await this.branchReadRepo.findByOuId(ouId)
      for (const row of customerRows) {
        const display = toBranchDisplay(row)
        if (display && !byId.has(display.branch_id)) {
          byId.set(display.branch_id, display)
        }
      }
    }

    for (const branchIdHex of ensureBranchIds) {
      if (!branchIdHex || byId.has(branchIdHex)) continue
      let branchOid
      try {
        branchOid = new ObjectId(branchIdHex)
      } catch {
        continue
      }
      const display = await this.findBranchDisplay(branchOid, ouId)
      if (display) byId.set(display.branch_id, display)
    }

    return sortBranchDisplayList([...byId.values()])
  }
}
