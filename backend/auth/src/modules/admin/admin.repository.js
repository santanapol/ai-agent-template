import { AUTH_COLLECTIONS } from '../../config/mongo-collections.js'

const MENUS = AUTH_COLLECTIONS.MENUS
const ROLE_PERMISSIONS = AUTH_COLLECTIONS.ROLE_PERMISSIONS
const USERS = AUTH_COLLECTIONS.USERS

export class AdminRepository {
  /** @param {import('mongodb').Db} db */
  constructor(db) {
    this.db = db
  }

  async getMenus() {
    return this.db.collection(MENUS).find({}).toArray()
  }

  async getMenuByKey(key) {
    return this.db.collection(MENUS).findOne({ key })
  }

  async createMenu(doc) {
    await this.db.collection(MENUS).insertOne(doc)
  }

  async updateMenu(key, doc) {
    // optimistic locking: ตรวจสอบ upd_date หรือ schema lock
    return this.db.collection(MENUS).updateOne({ key }, { $set: doc })
  }

  async deleteMenu(key) {
    await this.db.collection(MENUS).deleteOne({ key })
  }

  async getRolePermissions(filter = {}) {
    return this.db.collection(ROLE_PERMISSIONS).find(filter).toArray()
  }

  async getRolePermissionByPair(ou_id, role) {
    return this.db.collection(ROLE_PERMISSIONS).findOne({ ou_id, role })
  }

  async upsertRolePermission(ou_id, role, updateDoc) {
    return this.db.collection(ROLE_PERMISSIONS).updateOne(
      { ou_id, role },
      {
        $set: updateDoc.set,
        $setOnInsert: updateDoc.setOnInsert
      },
      { upsert: true }
    )
  }

  async deleteRolePermission(ou_id, role) {
    return this.db.collection(ROLE_PERMISSIONS).deleteOne({ ou_id, role })
  }

  async countChildMenus(parentKey) {
    return this.db.collection(MENUS).countDocuments({ parent_key: parentKey })
  }

  async isMenuReferenced(key) {
    // key ถูกอ้างใน menu_keys หรือไม่ (รวมถึง exact key)
    // สำหรับ wildcard pattern คุมโดย service layer
    const count = await this.db.collection(ROLE_PERMISSIONS).countDocuments({
      menu_keys: key
    })
    return count > 0
  }

  async countUsersInScope(ou_id, role) {
    return this.db.collection(USERS).countDocuments({ ou_id, role })
  }

  async getUsersInScope(ou_id, role) {
    return this.db.collection(USERS).find({ ou_id, role }, { projection: { _id: 1 } }).toArray()
  }

  async bumpUsersTokenGen(ou_id, role) {
    return this.db.collection(USERS).updateMany(
      { ou_id, role },
      { $inc: { access_token_gen: 1 } }
    )
  }
  
  async insertAudit(doc) {
    return this.db.collection(AUTH_COLLECTIONS.AUDIT_EVENTS).insertOne(doc)
  }
}
