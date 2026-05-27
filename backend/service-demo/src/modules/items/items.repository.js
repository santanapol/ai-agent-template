import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { encodeEtagFromDate, encodeEtagFromItemDoc } from "../../lib/etag.js";

const COLLECTION = "items";

function omitUndefinedValues(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

function collection() {
  return getDatabase().collection(COLLECTION);
}

function mapPublic(item) {
  if (!item) {
    return null;
  }

  return {
    id: item._id.toString(),
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    status: item.status,
    tags: item.tags || [],
  };
}

function toTenantId(value) {
  if (
    typeof value === "string" &&
    value.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(value)
  ) {
    return new ObjectId(value);
  }
  return value;
}

function buildTenantFilter(userContext) {
  return {
    ou_id: toTenantId(userContext.ouId),
    branch_id: toTenantId(userContext.branchId),
  };
}

function now() {
  return new Date();
}

export async function createItem(payload, userContext, routeTemplate) {
  const current = now();
  const _id = new ObjectId();

  const doc = {
    _id,
    ou_id: toTenantId(userContext.ouId),
    branch_id: toTenantId(userContext.branchId),
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    status: payload.status,
    tags: payload.tags || [],
    cr_by: userContext.userId,
    cr_date: current,
    cr_prog: routeTemplate,
    upd_by: userContext.userId,
    upd_date: current,
    upd_prog: routeTemplate,
  };

  await collection().insertOne(doc);
  return {
    item: mapPublic(doc),
    etag: encodeEtagFromItemDoc(doc),
  };
}

export async function listItems({ page, limit }, userContext) {
  const filter = buildTenantFilter(userContext);
  const skip = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    collection().countDocuments(filter),
    collection()
      .find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  return {
    items: docs.map(mapPublic),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function findById(id, userContext) {
  const filter = {
    _id: new ObjectId(id),
    ...buildTenantFilter(userContext),
  };

  const doc = await collection().findOne(filter);
  if (!doc) {
    return null;
  }

  return {
    item: mapPublic(doc),
    etag: encodeEtagFromItemDoc(doc),
    updDate: doc.upd_date,
  };
}

export async function replaceById(
  id,
  payload,
  userContext,
  routeTemplate,
  ifMatchDate,
) {
  const current = now();
  const _id = new ObjectId(id);
  const tenantFilter = buildTenantFilter(userContext);
  const existing = await collection().findOne({ _id, ...tenantFilter });

  if (!existing) {
    return { matchedCount: 0 };
  }

  const replacement = {
    _id,
    ou_id: toTenantId(userContext.ouId),
    branch_id: toTenantId(userContext.branchId),
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    status: payload.status,
    tags: payload.tags || [],
    cr_by: existing.cr_by,
    cr_date: existing.cr_date,
    cr_prog: existing.cr_prog,
    upd_by: userContext.userId,
    upd_date: current,
    upd_prog: routeTemplate,
  };

  const result = await collection().replaceOne(
    {
      _id,
      ...tenantFilter,
      upd_date: ifMatchDate,
    },
    replacement,
  );

  return {
    matchedCount: result.matchedCount,
    item: replacement,
    etag: encodeEtagFromDate(current),
  };
}

export async function patchById(
  id,
  patch,
  userContext,
  routeTemplate,
  ifMatchDate,
) {
  const current = now();
  const _id = new ObjectId(id);

  const updates = {
    ...patch,
    upd_by: userContext.userId,
    upd_date: current,
    upd_prog: routeTemplate,
  };

  if (!Object.prototype.hasOwnProperty.call(patch, "description")) {
    delete updates.description;
  }
  if (!Object.prototype.hasOwnProperty.call(patch, "tags")) {
    delete updates.tags;
  }

  const setPayload = omitUndefinedValues(updates);

  const doc = await collection().findOneAndUpdate(
    {
      _id,
      ...buildTenantFilter(userContext),
      upd_date: ifMatchDate,
    },
    { $set: setPayload },
    { returnDocument: "after" },
  );

  if (!doc) {
    return { matchedCount: 0, doc: null, item: null, etag: null };
  }

  return {
    matchedCount: 1,
    doc,
    item: mapPublic(doc),
    etag: encodeEtagFromItemDoc(doc),
  };
}

export async function deleteById(id, userContext, ifMatchDate) {
  const _id = new ObjectId(id);
  const result = await collection().deleteOne({
    _id,
    ...buildTenantFilter(userContext),
    upd_date: ifMatchDate,
  });

  return result.deletedCount;
}

export async function existsById(id, userContext) {
  const _id = new ObjectId(id);
  const doc = await collection().findOne({
    _id,
    ...buildTenantFilter(userContext),
  });
  return Boolean(doc);
}
