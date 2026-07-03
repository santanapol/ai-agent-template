export function fieldErrorIds(name: string) {
  const errorId = `${name}-error`;
  return { errorId, describedBy: errorId, ariaInvalid: true as const };
}
