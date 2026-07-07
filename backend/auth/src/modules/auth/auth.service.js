import { BranchAccessResolver } from './branch-access.resolver.js'
import { authMixin as auditMixin } from './auth.audit.js'
import { authMixin as throttleMixin } from './auth.throttle.js'
import { authMixin as permissionsMixin } from './auth.permissions.js'
import { authMixin as menusMixin } from './auth.menus.js'
import { authMixin as branchMixin } from './auth.branch.js'
import { authMixin as tokensMixin } from './auth.tokens.js'
import { authMixin as loginMixin } from './auth.login.js'
import { authMixin as passwordMixin } from './auth.password.js'
import { authMixin as usersMixin } from './auth.users.js'
import { authMixin as coreMixin } from './auth.core.js'

export class AuthService {
  /**
   * @param {{
   *  env: Record<string, unknown>
   *  repo: import('./auth.repository.js').AuthRepository
   *  mongoClient: import('mongodb').MongoClient
   *  privateKey: import('jose').KeyLike
   *  types: ReturnType<typeof import('../../lib/problem.js').problemTypes>
   *  redisClient?: import('redis').RedisClientType | null
   *  branchReadRepo?: import('./branch-read.repository.js').BranchReadRepository | null
   *  branchAccessResolver?: import('./branch-access.resolver.js').BranchAccessResolver | null
   *  log?: { warn: (obj: unknown, msg?: string) => void }
   * }} p
   */
  constructor({
    env,
    repo,
    mongoClient,
    privateKey,
    types,
    redisClient = null,
    branchReadRepo = null,
    branchAccessResolver = null,
    log = null
  }) {
    this.env = env
    this.repo = repo
    this.mongoClient = mongoClient
    this.privateKey = privateKey
    this.types = types
    this.redisClient = redisClient
    this.branchReadRepo = branchReadRepo
    this.branchAccessResolver = branchAccessResolver ?? new BranchAccessResolver({ branchReadRepo })
    this.log = log
  }
}

Object.assign(
  AuthService.prototype,
  auditMixin,
  throttleMixin,
  permissionsMixin,
  menusMixin,
  branchMixin,
  tokensMixin,
  loginMixin,
  passwordMixin,
  usersMixin,
  coreMixin
)
