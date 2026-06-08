const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isValidObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

export const objectIdSchema = {
  type: 'string',
  pattern: '^[a-f0-9]{24}$',
};
