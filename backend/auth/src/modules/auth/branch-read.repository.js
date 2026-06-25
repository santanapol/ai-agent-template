const BRANCH_COLLECTION = 'su_branch'

export class BranchReadRepository {
  /**
   * @param {import('mongodb').Db} db
   */
  constructor(db) {
    this.db = db
  }

  /**
   * @param {import('mongodb').ObjectId} branchId
   * @returns {Promise<import('mongodb').Document | null>}
   */
  async findById(branchId) {
    return this.db.collection(BRANCH_COLLECTION).findOne({ _id: branchId })
  }

  /**
   * @param {import('mongodb').ObjectId} branchId
   * @param {import('mongodb').ObjectId} ouId
   * @returns {Promise<import('mongodb').Document | null>}
   */
  async findByIdInOu(branchId, ouId) {
    return this.db.collection(BRANCH_COLLECTION).findOne({ _id: branchId, ou_id: ouId })
  }

  /**
   * Distinguishes missing branch (404) from cross-OU branch (403) for active-branch switch.
   * @returns {Promise<'not_found' | 'forbidden' | 'inactive' | 'ok'>}
   */
  async resolveBranchAccess(branchId, ouId) {
    const branch = await this.findById(branchId)
    if (!branch) return 'not_found'

    const branchOu = branch.ou_id?.toHexString?.() ?? String(branch.ou_id)
    const expectedOu = ouId?.toHexString?.() ?? String(ouId)
    if (branchOu !== expectedOu) return 'forbidden'
    if (branch.active === false) return 'inactive'
    return 'ok'
  }
}
