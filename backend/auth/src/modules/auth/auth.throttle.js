import { applyFailure, isLocked } from '../../lib/throttle.js'
import { ipThrottleKey, userThrottleKey } from './auth.helpers.js'

export const authMixin = {
  async assertNotLocked({ ip, userId, now }) {
    const ipDoc = await this.repo.getThrottle(ipThrottleKey(ip))
    if (isLocked(now, ipDoc?.locked_until)) {
      return { blocked: true, status: 429, type: this.types.ipThrottle }
    }
    if (userId) {
      const uDoc = await this.repo.getThrottle(userThrottleKey(userId))
      if (isLocked(now, uDoc?.locked_until)) {
        return { blocked: true, status: 423, type: this.types.accountLocked }
      }
    }
    return { blocked: false }
  },

  async recordFailures(keys, now) {
    await Promise.all(
      keys.map(async (key) => {
        const doc = await this.repo.getThrottle(key)
        const next = applyFailure(now, doc)
        await this.repo.setThrottle(
          key,
          {
            window_started_at: next.window_started_at,
            fail_count: next.fail_count,
            locked_until: next.locked_until
          },
          undefined
        )
      })
    )
  },

  async clearThrottleKeys(keys) {
    await this.repo.deleteThrottleKeys(keys, undefined)
  }
}
