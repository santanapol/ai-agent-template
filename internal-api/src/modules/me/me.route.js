import { Router } from 'express'
import { getMe } from './me.controller.js'

export function createMeRouter () {
  const r = Router()
  r.get('/me', getMe)
  return r
}
