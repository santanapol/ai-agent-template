import { createPrivateKey, createPublicKey } from 'node:crypto'
import { SignJWT, exportJWK, importPKCS8, importSPKI, jwtVerify } from 'jose'

export async function loadSigningMaterial(pem) {
  const privateKey = await importPKCS8(pem, 'RS256')
  const nodePrivate = createPrivateKey(pem)
  const spkiPem = createPublicKey(nodePrivate).export({ type: 'spki', format: 'pem' })
  const spki = typeof spkiPem === 'string' ? spkiPem : Buffer.from(spkiPem).toString('utf8')
  const publicKey = await importSPKI(spki, 'RS256')
  const jwk = await exportJWK(publicKey)
  return { privateKey, publicKey, jwk }
}

/**
 * @param {{ token: string, publicKey: import('jose').KeyLike, issuer?: string, audience?: string }} p
 */
export async function verifyAccessJwt({ token, publicKey, issuer, audience }) {
  /** @type {import('jose').JWTVerifyOptions} */
  const options = {}
  if (issuer && String(issuer).length > 0) options.issuer = String(issuer)
  if (audience && String(audience).length > 0) options.audience = String(audience)
  const { payload } = await jwtVerify(token, publicKey, options)
  return payload
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
  tokenGen,
  issuer,
  audience,
  ttlSeconds
}) {
  const builder = new SignJWT({
    [roleClaim]: role,
    ou_id: ouId,
    branch_id: branchId,
    token_gen: tokenGen
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)

  if (issuer && String(issuer).length > 0) builder.setIssuer(String(issuer))
  if (audience && String(audience).length > 0) builder.setAudience(String(audience))

  return builder.sign(privateKey)
}
