/**
 * RFC 7807 Problem Details + required `code` for auth errors.
 * ทุก `code` ที่ส่งให้ client **ต้อง** อยู่ใน `_coding-standards/auth/codes.yaml`
 * @param {{ type: string, title: string, status: number, detail?: string, code: string }} p
 */
export function problemPayload({ type, title, status, detail, code }) {
  if (!code) throw new Error('problemPayload requires `code`')
  return {
    type,
    title,
    status,
    ...(detail ? { detail } : {}),
    code
  }
}

export function problemTypes(base) {
  const b = base.replace(/\/$/u, '')
  return {
    validation: `${b}/invalid-request`,
    forbidden: `${b}/forbidden`,
    menuNotFound: `${b}/menu-not-found`,
    rolePermissionNotFound: `${b}/role-permission-not-found`,
    preconditionFailed: `${b}/precondition-failed`,
    invalidCredentials: `${b}/invalid-credentials`,
    rateLimit: `${b}/too-many-attempts`,
    ipThrottle: `${b}/too-many-attempts`,
    accountLocked: `${b}/account-locked`,
    invalidToken: `${b}/refresh-rejected`,
    tokenReuse: `${b}/refresh-rejected`,
    notReady: `${b}/not-ready`,
    internalUnauthorized: `${b}/internal-unauthorized`,
    userNotFound: `${b}/user-not-found`,
    userAlreadyExists: `${b}/user-already-exists`,
    passwordUnchanged: `${b}/password-unchanged`,
    passwordPolicyViolation: `${b}/password-policy-violation`
  }
}
