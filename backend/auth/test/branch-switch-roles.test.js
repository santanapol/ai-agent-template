import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRANCH_SWITCH_ROLES } from '../src/lib/branch-switch-roles.js'

test('BRANCH_SWITCH_ROLES includes OU-wide switcher roles only', () => {
  assert.deepEqual([...BRANCH_SWITCH_ROLES].sort(), ['platform_admin', 'support', 'support_admin'])
  assert.equal(BRANCH_SWITCH_ROLES.has('branch_admin'), false)
  assert.equal(BRANCH_SWITCH_ROLES.has('staff'), false)
})
