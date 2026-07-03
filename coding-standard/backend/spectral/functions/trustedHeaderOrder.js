/** Enforce mesh header parameter order (see coding-standard/backend/8-openapi-validation.md). */
const ORDER = [
  "x-user-ou",
  "x-user-branch",
  "x-user-home-branch",
  "x-user-id",
  "x-user-role",
  "if-match",
  "x-request-id",
];

function rank(name) {
  const key = String(name).toLowerCase();
  const idx = ORDER.indexOf(key);
  return idx === -1 ? ORDER.length + key.charCodeAt(0) : idx;
}

export default function trustedHeaderOrder(target, _opts, context) {
  if (!Array.isArray(target)) {
    return;
  }

  const headers = target
    .filter((p) => p && p.in === "header" && typeof p.name === "string")
    .map((p) => p.name);

  const sorted = [...headers].sort((a, b) => rank(a) - rank(b));
  const same =
    headers.length === sorted.length &&
    headers.every((name, i) => name === sorted[i]);

  if (!same) {
    return [
      {
        message: `Header parameters must follow order: ${ORDER.join(", ")} (unused may be omitted)`,
        path: context.path,
      },
    ];
  }
}
