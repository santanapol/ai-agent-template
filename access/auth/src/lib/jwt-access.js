import { createPrivateKey, createPublicKey } from 'node:crypto'
import { SignJWT, exportJWK, importPKCS8, importSPKI } from 'jose'

export async function loadSigningMaterial(pem) {
  const privateKey = await importPKCS8(pem, 'RS256')
  const nodePrivate = createPrivateKey(pem)
  const spkiPem = createPublicKey(nodePrivate).export({ type: 'spki', format: 'pem' })
  const spki = typeof spkiPem === 'string' ? spkiPem : Buffer.from(spkiPem).toString('utf8')
  const publicKey = await importSPKI(spki, 'RS256')
  const jwk = await exportJWK(publicKey)
  return { privateKey, jwk }
}

export function finalizeJwk(jwk, kid) {
  return {
    ...jwk,
    kid,
    use: 'sig',
    alg: 'RS256'
  }
}

export async function signAccessJwt({
  privateKey,
  kid,
  sub,
  role,
  roleClaim,
  ouId,
  branchId,
  issuer,
  audience,
  ttlSeconds
}) {
  const builder = new SignJWT({
    [roleClaim]: role,
    ou_id: ouId,
    branch_id: branchId
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)

  if (issuer && String(issuer).length > 0) builder.setIssuer(String(issuer))
  if (audience && String(audience).length > 0) builder.setAudience(String(audience))

  return builder.sign(privateKey)
}
