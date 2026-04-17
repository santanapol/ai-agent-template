export function problemPayload ({ type, title, status, detail }) {
  return { type, title, status, ...(detail ? { detail } : {}) }
}

export function problemTypes (base) {
  const b = base.replace(/\/$/u, '')
  return {
    validation: `${b}/validation-error`,
    invalidCredentials: `${b}/invalid-credentials`,
    rateLimit: `${b}/rate-limit`,
    ipThrottle: `${b}/ip-throttle`,
    accountLocked: `${b}/account-locked`,
    invalidToken: `${b}/invalid-token`,
    tokenReuse: `${b}/token-reuse`
  }
}
