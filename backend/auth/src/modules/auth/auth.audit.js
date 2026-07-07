import { ipDigest } from './auth.helpers.js'

export const authMixin = {
  async audit({ event_type, outcome, request_id, user_id, ip, detail_safe }) {
    try {
      await this.repo.insertAudit({
        event_type,
        outcome,
        request_id,
        user_id,
        ip_digest: ip ? ipDigest(ip) : null,
        detail_safe
      })
    } catch (err) {
      // never block auth on audit failure — but surface the failure for ops visibility
      this.log?.warn?.({ err, event_type }, 'audit insert failed')
    }
  },

  async auditActiveBranchDenied({ request_id, user_id, ip, reason, branch_id }) {
    await this.audit({
      event_type: 'auth.active_branch_denied',
      outcome: 'fail',
      request_id,
      user_id,
      ip,
      detail_safe: {
        reason,
        ...(branch_id ? { branch_id } : {})
      }
    })
  }
}
