export {
  assertPermission,
  assertAdminRole,
  assertPlatformAdmin,
  assertAdminCanLinkUser,
  tenantContextFromAuthUser,
  resolveListScope,
  callerSelfBranchId,
  resolveLookupScope,
  assertProfileScope,
  assertLookupQueryExclusive,
  resolveGetByIdScope,
  assertAdminLifecycleAccess,
} from "./profiles.access.js";

export {
  getProfileById,
  lookupProfileByUserId,
  listProfiles,
} from "./profiles.read.js";

export {
  createProfile,
  assertPatchBodyAllowed,
  patchProfile,
} from "./profiles.mutations.js";

export {
  archiveProfile,
  restoreProfile,
  resetProfilePassword,
  changeProfileRole,
} from "./profiles.lifecycle.js";
