import { AUTH_COLLECTIONS } from '../../config/mongo-collections.js'
import { resolveBranchAccessFromDoc } from './branch-access-resolve.js'

const COLLECTION = AUTH_COLLECTIONS.PLATFORM_BRANCHES

export class PlatformBranchRepository {
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
    return this.db.collection(COLLECTION).findOne({ _id: branchId })
  }

  /**
   * @param {import('mongodb').ObjectId} branchId
   * @param {import('mongodb').ObjectId} ouId
   * @returns {Promise<import('mongodb').Document | null>}
   */
  async findByIdInOu(branchId, ouId) {
    return this.db.collection(COLLECTION).findOne({ _id: branchId, ou_id: ouId })
  }

  /**
   * @param {import('mongodb').ObjectId} ouId
   */
  async findByOuId(ouId) {
    return this.db
      .collection(COLLECTION)
      .find({ ou_id: ouId })
      .project({ branch_name: 1, branch_code: 1, active: 1 })
      .sort({ branch_name: 1 })
      .toArray()
  }

  /**
   * @returns {Promise<'not_found' | 'forbidden' | 'inactive' | 'ok'>}
   */
  async resolveBranchAccess(branchId, ouId) {
    const branch = await this.findById(branchId)
    return resolveBranchAccessFromDoc(branch, ouId)
  }
}
