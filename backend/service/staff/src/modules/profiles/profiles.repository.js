import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { STAFF_COLLECTIONS } from "../../config/mongo-collections.js";
import { encodeEtagFromItemDoc } from "../../lib/etag.js";
import { toObjectId } from "../../lib/utils/mongo.js";

export { toObjectId };

function profilesCollection() {
  return getDatabase().collection(STAFF_COLLECTIONS.STAFF_PROFILES);
}

function usersCollection() {
  return getDatabase().collection(STAFF_COLLECTIONS.USERS);
}

/**
 * Tenant scope for reads/writes — always includes ou_id; branch when provided.
 * @param {{ ouId: string, branchId?: string }} scope
 */
export function buildScopeFilter(scope) {
  const filter = { ou_id: toObjectId(scope.ouId) };
  if (scope.branchId) {
    filter.branch_id = toObjectId(scope.branchId);
  }
  return filter;
}

/**
 * Map Mongo document to API profile (no cr_* / upd_*).
 * @param {import('mongodb').Document | null} doc
 * @param {{ username: string, role: string } | null} [userSnippet]
 */
export function mapToApi(doc, userSnippet = null) {
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    user_id: doc.user_id ? doc.user_id.toString() : null,
    ou_id: doc.ou_id.toString(),
    branch_id: doc.branch_id.toString(),
    status: doc.status,
    code: doc.code,
    firstname: doc.firstname,
    lastname: doc.lastname,
    email: doc.email ?? null,
    tel: doc.tel ?? null,
    user: userSnippet ?? { username: "", role: "" },
  };
}

async function findUserSnippet(userId) {
  if (!userId) return null;
  const user = await usersCollection().findOne(
    { _id: toObjectId(userId) },
    { projection: { username: 1, role: 1 } },
  );
  return user ? { username: user.username, role: user.role } : null;
}

/**
 * @param {string} userId hex24
 */
export async function findAuthUserById(userId) {
  return usersCollection().findOne({ _id: toObjectId(userId) });
}

/** Cross-tenant: one auth user → at most one staff profile. */
export async function existsProfileByUserId(userId) {
  const doc = await profilesCollection().findOne(
    { user_id: toObjectId(userId) },
    { projection: { _id: 1 } },
  );
  return Boolean(doc);
}

/**
 * @param {string} ouId
 * @param {string} branchId
 * @param {string} code
 */
export async function existsProfileByCode(ouId, branchId, code) {
  const doc = await profilesCollection().findOne(
    {
      ou_id: toObjectId(ouId),
      branch_id: toObjectId(branchId),
      code,
    },
    { projection: { _id: 1 } },
  );
  return Boolean(doc);
}

/**
 * @param {object} fields
 * @param {string} [fields.user_id]
 * @param {string} fields.code
 * @param {string} fields.firstname
 * @param {string} fields.lastname
 * @param {string} [fields.email]
 * @param {string} [fields.tel]
 * @param {'active'|'archived'} [fields.status]
 * @param {{ userId: string, ouId: string, branchId: string }} userContext
 * @param {string} routeTemplate
 */
export async function insertProfile(fields, userContext, routeTemplate) {
  const now = new Date();
  const _id = new ObjectId();

  const doc = {
    _id,
    user_id: fields.user_id ? toObjectId(fields.user_id) : null,
    ou_id: toObjectId(userContext.ouId),
    branch_id: toObjectId(userContext.branchId),
    status: fields.status ?? "active",
    code: fields.code,
    firstname: fields.firstname,
    lastname: fields.lastname,
    ...(fields.email !== undefined ? { email: fields.email } : {}),
    ...(fields.tel !== undefined ? { tel: fields.tel } : {}),
    cr_by: userContext.userId,
    cr_date: now,
    cr_prog: routeTemplate,
    upd_by: userContext.userId,
    upd_date: now,
    upd_prog: routeTemplate,
  };

  await profilesCollection().insertOne(doc);

  let userSnippet = null;
  if (doc.user_id) {
    userSnippet = await findUserSnippet(doc.user_id);
  }
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
    _raw: doc,
  };
}

/**
 * Link a provisional profile (created without user_id) to an auth user.
 * Used after provisionUser succeeds in the create-provision flow.
 * @param {string} profileId hex24
 * @param {{ ouId: string, branchId?: string }} scope
 * @param {string} userId hex24
 * @param {{ userId: string }} userContext
 * @param {string} routeTemplate
 * @returns {Promise<{ profile: object, etag: string } | null>}
 */
export async function linkProfileToUser(
  profileId,
  scope,
  userId,
  userContext,
  routeTemplate,
) {
  const filter = {
    _id: toObjectId(profileId),
    ...buildScopeFilter(scope),
    user_id: null,
  };
  const now = new Date();

  const doc = await profilesCollection().findOneAndUpdate(
    filter,
    {
      $set: {
        user_id: toObjectId(userId),
        upd_by: userContext.userId,
        upd_date: now,
        upd_prog: routeTemplate,
      },
    },
    { returnDocument: "after" },
  );

  if (!doc) {
    return null;
  }

  const userSnippet = await findUserSnippet(doc.user_id);
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
  };
}

/**
 * Delete a profile by ID (used for cleanup when provision fails).
 * @param {string} profileId hex24
 * @param {{ ouId: string, branchId?: string }} scope
 */
export async function deleteProfileById(profileId, scope) {
  const filter = {
    _id: toObjectId(profileId),
    ...buildScopeFilter(scope),
  };
  const result = await profilesCollection().deleteOne(filter);
  return result.deletedCount === 1;
}

/**
 * @param {string} profileId hex24
 * @param {{ ouId: string, branchId?: string }} scope
 */
export async function findById(profileId, scope) {
  const filter = {
    _id: toObjectId(profileId),
    ...buildScopeFilter(scope),
  };

  const doc = await profilesCollection().findOne(filter);
  if (!doc) {
    return null;
  }

  const userSnippet = await findUserSnippet(doc.user_id);
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
  };
}

/**
 * @param {string} userId auth_users._id hex24
 * @param {{ ouId: string, branchId?: string }} scope
 */
export async function findByUserId(userId, scope) {
  const filter = {
    user_id: toObjectId(userId),
    ...buildScopeFilter(scope),
  };

  const doc = await profilesCollection().findOne(filter);
  if (!doc) {
    return null;
  }

  const userSnippet = await findUserSnippet(doc.user_id);
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
  };
}

const SORTABLE_FIELDS = new Set(["code", "firstname", "lastname", "upd_date"]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} [sort]
 * @returns {Record<string, 1 | -1>}
 */
export function parseListSort(sort) {
  const raw = sort?.trim() || "-upd_date";
  const descending = raw.startsWith("-");
  const field = descending ? raw.slice(1) : raw;

  if (!SORTABLE_FIELDS.has(field)) {
    throw new Error(`Invalid sort field: ${field}`);
  }

  return { [field]: descending ? -1 : 1 };
}

/**
 * @param {'active'|'archived'|'all'} status
 */
function buildStatusFilter(status) {
  if (status === "all") {
    return {};
  }
  return { status };
}

function listIndexHint(scope, status) {
  if (!scope.branchId && status === "archived") {
    return "list_archived_by_ou";
  }
  if (scope.branchId) {
    return "list_by_branch_status";
  }
  return undefined;
}

async function mapDocsWithUsers(docs) {
  if (docs.length === 0) {
    return [];
  }

  const userIds = [...new Set(docs.map((doc) => doc.user_id.toString()))];
  const users = await usersCollection()
    .find({ _id: { $in: userIds.map((id) => toObjectId(id)) } })
    .project({ username: 1, role: 1 })
    .toArray();

  const userById = new Map(
    users.map((user) => [
      user._id.toString(),
      { username: user.username, role: user.role },
    ]),
  );

  return docs.map((doc) =>
    mapToApi(doc, userById.get(doc.user_id.toString()) ?? null),
  );
}

/**
 * @param {{ page: number, limit: number, status: 'active'|'archived'|'all', q?: string, sort?: string }} query
 * @param {{ ouId: string, branchId?: string }} scope
 */
export async function listProfiles(query, scope) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const match = {
    ...buildScopeFilter(scope),
    ...buildStatusFilter(query.status),
  };
  const sortSpec = parseListSort(query.sort);
  const hint = listIndexHint(scope, query.status);
  const searchTerm = query.q?.trim();

  if (searchTerm) {
    const regexPattern = escapeRegex(searchTerm);
    const regexMatch = { $regex: regexPattern, $options: "i" };
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: STAFF_COLLECTIONS.USERS,
          localField: "user_id",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      {
        $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          $or: [
            { code: regexMatch },
            { firstname: regexMatch },
            { lastname: regexMatch },
            { "userDoc.username": regexMatch },
          ],
        },
      },
      { $sort: sortSpec },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const aggOptions = hint ? { hint } : {};
    const [facetResult] = await profilesCollection()
      .aggregate(pipeline, aggOptions)
      .toArray();
    const total = facetResult?.metadata?.[0]?.total ?? 0;
    const docs = facetResult?.data ?? [];

    const profiles = docs.map((doc) =>
      mapToApi(
        doc,
        doc.userDoc
          ? { username: doc.userDoc.username, role: doc.userDoc.role }
          : null,
      ),
    );

    return {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  const collection = profilesCollection();
  let findQuery = collection.find(match).sort(sortSpec).skip(skip).limit(limit);

  if (hint) {
    findQuery = findQuery.hint(hint);
  }

  const [docs, total] = await Promise.all([
    findQuery.toArray(),
    collection.countDocuments(match),
  ]);

  const profiles = await mapDocsWithUsers(docs);

  return {
    profiles,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

/**
 * @param {string} profileId hex24
 * @param {{ ouId: string, branchId?: string }} scope
 * @param {Record<string, string>} fields
 * @param {{ userId: string, ouId: string, branchId: string }} userContext
 * @param {string} routeTemplate
 * @param {Date} ifMatchDate
 * @param {string[]} [unsetFields]
 */
export async function updateProfile(
  profileId,
  scope,
  fields,
  userContext,
  routeTemplate,
  ifMatchDate,
  unsetFields = [],
) {
  const baseFilter = {
    _id: toObjectId(profileId),
    ...buildScopeFilter(scope),
  };
  const versionFilter = { ...baseFilter, upd_date: ifMatchDate };
  const now = new Date();
  const updateDoc = {
    $set: {
      ...fields,
      upd_by: userContext.userId,
      upd_date: now,
      upd_prog: routeTemplate,
    },
    ...(unsetFields.length > 0
      ? { $unset: Object.fromEntries(unsetFields.map((field) => [field, ""])) }
      : {}),
  };

  const doc = await profilesCollection().findOneAndUpdate(
    versionFilter,
    updateDoc,
    { returnDocument: "after" },
  );

  if (!doc) {
    const exists = await profilesCollection().findOne(baseFilter, {
      projection: { _id: 1 },
    });
    if (!exists) {
      return null;
    }
    return { stale: true };
  }

  const userSnippet = await findUserSnippet(doc.user_id);
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
  };
}

/**
 * @param {string} profileId hex24
 * @param {{ ouId: string, branchId?: string }} scope
 * @param {'active'|'archived'} expectedStatus
 * @param {'active'|'archived'} nextStatus
 * @param {{ userId: string, ouId: string, branchId: string }} userContext
 * @param {string} routeTemplate
 * @param {Date} ifMatchDate
 * @returns {Promise<{ profile: object, etag: string } | { stale: true } | { invalidTransition: true } | null>}
 */
export async function updateProfileStatus(
  profileId,
  scope,
  expectedStatus,
  nextStatus,
  userContext,
  routeTemplate,
  ifMatchDate,
) {
  const idScopeFilter = {
    _id: toObjectId(profileId),
    ...buildScopeFilter(scope),
  };
  const baseFilter = { ...idScopeFilter, status: expectedStatus };
  const versionFilter = { ...baseFilter, upd_date: ifMatchDate };
  const now = new Date();

  const doc = await profilesCollection().findOneAndUpdate(
    versionFilter,
    {
      $set: {
        status: nextStatus,
        upd_by: userContext.userId,
        upd_date: now,
        upd_prog: routeTemplate,
      },
    },
    { returnDocument: "after" },
  );

  if (!doc) {
    const existing = await profilesCollection().findOne(idScopeFilter, {
      projection: { _id: 1, status: 1, upd_date: 1 },
    });
    if (!existing) {
      return null;
    }
    if (existing.status !== expectedStatus) {
      return { invalidTransition: true };
    }
    return { stale: true };
  }

  const userSnippet = await findUserSnippet(doc.user_id);
  return {
    profile: mapToApi(doc, userSnippet),
    etag: encodeEtagFromItemDoc(doc),
  };
}
