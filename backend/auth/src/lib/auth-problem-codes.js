/**
 * Maps problem `type` URIs to registry codes in `_coding-standards/auth/codes.yaml`.
 * @param {ReturnType<typeof import('./problem.js').problemTypes>} types
 * @param {string} typeUri
 * @returns {string | undefined}
 */
export function codeForProblemType(types, typeUri) {
  if (typeUri === types.validation) return 'AUTH_INVALID_REQUEST'
  if (typeUri === types.invalidCredentials) return 'LOGIN_INVALID_CREDENTIALS'
  if (typeUri === types.accountLocked) return 'LOGIN_ACCOUNT_LOCKED'
  if (typeUri === types.ipThrottle) return 'AUTH_TOO_MANY_ATTEMPTS'
  if (typeUri === types.rateLimit) return 'AUTH_TOO_MANY_ATTEMPTS'
  if (typeUri === types.invalidToken) return 'TOKEN_REFRESH_REJECTED'
  if (typeUri === types.tokenReuse) return 'TOKEN_REFRESH_REJECTED'
  if (typeUri === types.notReady) return 'AUTH_NOT_READY'
  if (typeUri === types.internalUnauthorized) return 'AUTH_INTERNAL_UNAUTHORIZED'
  if (typeUri === types.userNotFound) return 'AUTH_USER_NOT_FOUND'
  if (typeUri === types.passwordUnchanged) return 'AUTH_PASSWORD_UNCHANGED'
  if (typeUri === types.passwordPolicyViolation) return 'AUTH_PASSWORD_POLICY_VIOLATION'
  if (typeUri === types.branchSwitchForbidden) return 'AUTH_BRANCH_SWITCH_FORBIDDEN'
  if (typeUri === types.branchForbidden) return 'AUTH_BRANCH_FORBIDDEN'
  if (typeUri === types.branchNotFound) return 'AUTH_BRANCH_NOT_FOUND'
  return undefined
}
