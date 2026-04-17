import { Router } from 'express'
import { getHealth } from './health.controller.js'

export function createHealthRouter () {
  const r = Router()
  r.get('/health', getHealth)
  return r
}
