import { generateKeyPairSync } from 'node:crypto'

export function generateRsaPkcs8Pem () {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return privateKey.export({ type: 'pkcs8', format: 'pem' })
}
