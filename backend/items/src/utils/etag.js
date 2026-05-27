export function generateETag(updDate) {
  const encoded = Buffer.from(updDate.toISOString()).toString('base64');
  return `W/"${encoded}"`;
}
