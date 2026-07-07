import { ObjectId } from 'mongodb'
import { ipDigest } from './admin.helpers.js'
import { adminMenusMixin } from './admin.menus.js'
import { adminRolePermissionsMixin } from './admin.role-permissions.js'

export class AdminService {
  constructor({ repo, env, redisClient = null, log = null, types }) {
    this.repo = repo
    this.env = env
    this.redisClient = redisClient
    this.log = log
    this.types = types
  }

  async audit({ event_type, outcome, request_id, user_id, ip, detail_safe }) {
    try {
      await this.repo.insertAudit({
        event_type,
        outcome,
        request_id,
        user_id: user_id ? new ObjectId(user_id) : null,
        ip_digest: ipDigest(ip),
        detail_safe
      })
    } catch (err) {
      this.log?.warn?.({ err, event_type }, 'audit insert failed')
    }
  }
}

Object.assign(AdminService.prototype, adminMenusMixin, adminRolePermissionsMixin)
