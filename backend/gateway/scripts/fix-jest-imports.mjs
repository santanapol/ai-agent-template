import fs from 'fs'
import path from 'path'

const dir = './test'

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // Remove `@jest/globals` import
  content = content.replace(/import\s+{.*}\s+from\s+'@jest\/globals'\n?/g, '')

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
