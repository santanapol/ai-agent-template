/**
 * Zero HQ — internal home branch for OU-wide platform roles (zero-platform DB only).
 */
import { OU_WIDE_STAFF_ROLES } from '@zero-platform/roles'

/** Dev/prod OU (777WW tenant). */
export const DEV_SEED_OU_ID = '5f4f9d57266ed249e45ecef5'

/** Customer demo branch (777WW / 7W) — branch_admin + staff home branch. */
export const DEV_SEED_CUSTOMER_BRANCH_ID = '5f4fb5bb3156af7a2db9e5a0'

/** Zero Platform internal HQ — lives in zero-platform.platform_branches only. */
export const ZERO_HQ_BRANCH_ID = '6a3000010000000000000001'
export const ZERO_HQ_BRANCH_CODE = 'ZERO'
export const ZERO_HQ_BRANCH_NAME = 'Zero HQ'
export const ZERO_HQ_BRANCH_TYPE = 'HQ'

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
