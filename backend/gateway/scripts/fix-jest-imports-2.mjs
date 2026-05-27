import fs from 'fs'
import path from 'path'

const dir = './test'

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  content = content.replace(
    /expect\(body\.rid\.length\)\.toBeGreaterThan\(0\)/g,
    'assert.ok(body.rid.length > 0)'
  )
  content = content.replace(
    /expect\(iSecret\)\.toBeGreaterThanOrEqual\(0\)/g,
    'assert.ok(iSecret >= 0)'
  )
  content = content.replace(
    /expect\(iOu\)\.toBeGreaterThan\(iSecret\)/g,
    'assert.ok(iOu > iSecret)'
  )
  content = content.replace(
    /expect\(iBranch\)\.toBeGreaterThan\(iOu\)/g,
    'assert.ok(iBranch > iOu)'
  )
  content = content.replace(
    /expect\(iUserId\)\.toBeGreaterThan\(iBranch\)/g,
    'assert.ok(iUserId > iBranch)'
  )
  content = content.replace(
    /expect\(iRole\)\.toBeGreaterThan\(iUserId\)/g,
    'assert.ok(iRole > iUserId)'
  )
  content = content.replace(
    /expect\(iIfMatch\)\.toBeGreaterThan\(iRole\)/g,
    'assert.ok(iIfMatch > iRole)'
  )
  content = content.replace(
    /expect\(iRequestId\)\.toBeGreaterThan\(iIfMatch\)/g,
    'assert.ok(iRequestId > iIfMatch)'
  )

  content = content.replace(
    /expect\((.*?)\)\.not\.toMatch\((.*?)\)/g,
    'assert.doesNotMatch(String($1), $2)'
  )

  // Multiline toEqual
  content = content.replace(
    /expect\(JSON\.parse\(res\.body\)\)\.toEqual\(\{/g,
    'assert.deepStrictEqual(JSON.parse(res.body), {'
  )
  content = content.replace(
    /expect\(reapplyRoutesEnvFromDotenvFile\(\{ envPath: join\(tmp, '\.env'\) \}\)\)\.toEqual\(\{/g,
    "assert.deepStrictEqual(reapplyRoutesEnvFromDotenvFile({ envPath: join(tmp, '.env') }), {"
  )

  // expect(() => ...).toThrow(...)
  content = content.replace(
    /expect\(\(\) =>([^]*?)\)\.toThrow\((.*?)\)/g,
    'assert.throws(() =>$1, $2)'
  )

  // redis-token-gen multiline
  content = content.replace(
    /expect\(accessTokenGenRedisKey\('507f1f77bcf86cd799439011'\)\)\.toBe\(/g,
    "assert.strictEqual(accessTokenGenRedisKey('507f1f77bcf86cd799439011'), "
  )

  content = content.replace(/expect\((.*?)\)\.toBeNull\(\)/g, 'assert.strictEqual($1, null)')

  fs.writeFileSync(filePath, content)
}

function walkDir(d) {
  const files = fs.readdirSync(d)
  for (const file of files) {
    const fullPath = path.join(d, file)
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath)
    } else if (fullPath.endsWith('.test.js')) {
      processFile(fullPath)
    }
  }
}

walkDir(dir)
