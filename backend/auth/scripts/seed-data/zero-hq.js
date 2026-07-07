/**
 * Zero HQ — internal home branch for OU-wide platform roles (zero-platform DB only).
 */
import { OU_WIDE_STAFF_ROLES } from '@zero-platform/roles'
import {
  ZERO_HQ_BRANCH_ID,
  ZERO_HQ_BRANCH_CODE,
  ZERO_HQ_BRANCH_NAME,
  ZERO_HQ_BRANCH_TYPE
} from '../../src/config/platform-branches.js'

export { ZERO_HQ_BRANCH_ID, ZERO_HQ_BRANCH_CODE, ZERO_HQ_BRANCH_NAME, ZERO_HQ_BRANCH_TYPE }

/** Dev/prod OU (777WW tenant). */
export const DEV_SEED_OU_ID = '5f4f9d57266ed249e45ecef5'

/** Customer demo branch (777WW / 7W) — branch_admin + staff home branch. */
export const DEV_SEED_CUSTOMER_BRANCH_ID = '5f4fb5bb3156af7a2db9e5a0'

/**
 * @param {string} role
 * @returns {boolean}
 */
export function isOuWideHomeBranchRole(role) {
  return OU_WIDE_STAFF_ROLES.has(role)
}

/**
 * @param {string} role
 * @returns {typeof DEV_SEED_CUSTOMER_BRANCH_ID | typeof ZERO_HQ_BRANCH_ID}
 */
export function homeBranchIdHexForRole(role) {
  return isOuWideHomeBranchRole(role) ? ZERO_HQ_BRANCH_ID : DEV_SEED_CUSTOMER_BRANCH_ID
}
