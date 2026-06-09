export class InternalService {
  /**
   * @param {{ authService: import('../auth/auth.service.js').AuthService }} p
   */
  constructor({ authService }) {
    this.authService = authService
  }

  createUser(params) {
    return this.authService.createUserByService(params)
  }

  revokeSessions(params) {
    return this.authService.revokeSessionsByUser(params)
  }

  setPassword(params) {
    return this.authService.setPasswordByService(params)
  }
}
