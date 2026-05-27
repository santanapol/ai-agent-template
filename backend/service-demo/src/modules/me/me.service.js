export function firstHeader(headers, name) {
  const v = headers[name];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export function buildMeFromTrustedHeaders(headers) {
  const userId = firstHeader(headers, "x-user-id").trim();
  const role = firstHeader(headers, "x-user-role").trim();
  const ou = firstHeader(headers, "x-user-ou").trim();
  const branch = firstHeader(headers, "x-user-branch").trim();

  if (!userId || !ou || !branch) {
    const err = new Error("MISSING_GATEWAY_USER_CONTEXT");
    err.code = "MISSING_GATEWAY_USER_CONTEXT";
    throw err;
  }
  if (userId.length > 128 || ou.length > 128 || branch.length > 128) {
    const err = new Error("INVALID_USER_CONTEXT");
    err.code = "INVALID_USER_CONTEXT";
    throw err;
  }
  if (role.length > 256) {
    const err = new Error("INVALID_USER_CONTEXT");
    err.code = "INVALID_USER_CONTEXT";
    throw err;
  }

  return {
    ou,
    branch,
    userId,
    role: role.length > 0 ? role : null,
  };
}
