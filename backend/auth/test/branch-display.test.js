import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBranchActive, toBranchDisplay } from '../src/modules/auth/branch-display.js'

test('isBranchActive treats falsey string and numeric zero as inactive', () => {
  assert.equal(isBranchActive(true), true)
  assert.equal(isBranchActive('1'), true)
  assert.equal(isBranchActive(false), false)
  assert.equal(isBranchActive('0'), false)
  assert.equal(isBranchActive(0), false)
})

test('toBranchDisplay maps su_branch document', () => {
  const display = toBranchDisplay({
    _id: { toHexString: () => '5f4fb5bb3156af7a2db9e5a0' },
    branch_code: '7W',
    branch_name: '777WW',
    active: '1'
  })
  assert.deepEqual(display, {
    branch_id: '5f4fb5bb3156af7a2db9e5a0',
    branch_code: '7W',
    branch_name: '777WW',
    active: true
  })
})
