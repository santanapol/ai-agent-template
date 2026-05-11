"use strict";

const { ObjectId } = require("mongodb");
const { getDatabase } = require("../../config/database");

const COLLECTION = "members";

function collection() {
  return getDatabase().collection(COLLECTION);
}

function now() {
  return new Date();
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

function mapMember(doc) {
  if (!doc) return null;
  return {
    userId: String(doc.user_id),
    username: doc.username,
    displayName: doc.display_name,
    email: doc.email ?? null,
    role: doc.role,
    status: doc.status,
  };
}

function buildScopeFilter(ouId, branchId) {
  return {
    ou_id: toTenantId(ouId),
    branch_id: toTenantId(branchId),
  };
}

async function listMembers({ ouId, branchId, page, limit }) {
  const filter = buildScopeFilter(ouId, branchId);
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
    members: docs.map(mapMember),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function createMember({
  ouId,
  branchId,
  body,
  actorUserId,
  routeTemplate,
}) {
  const current = now();
  const doc = {
    _id: new ObjectId(),
    ou_id: toTenantId(ouId),
    branch_id: toTenantId(branchId),
    user_id: new ObjectId().toString(),
    username: body.username,
    display_name: body.displayName,
    email: body.email ?? null,
    role: body.role,
    status: body.status ?? "active",
    password_hash: "<managed-internal>",
    cr_by: actorUserId,
    cr_date: current,
    cr_prog: routeTemplate,
    upd_by: actorUserId,
    upd_date: current,
    upd_prog: routeTemplate,
  };

  await collection().insertOne(doc);
  return mapMember(doc);
}

async function findMemberByUserId({ ouId, branchId, userId }) {
  const filter = {
    ...buildScopeFilter(ouId, branchId),
    user_id: userId,
  };
  const doc = await collection().findOne(filter);
  return doc || null;
}

async function updateMember({
  ouId,
  branchId,
  userId,
  patch,
  actorUserId,
  routeTemplate,
}) {
  const setPatch = {
    upd_by: actorUserId,
    upd_date: now(),
    upd_prog: routeTemplate,
  };

  if (Object.prototype.hasOwnProperty.call(patch, "displayName")) {
    setPatch.display_name = patch.displayName;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "email")) {
    setPatch.email = patch.email;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "role")) {
    setPatch.role = patch.role;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    setPatch.status = patch.status;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "password")) {
    setPatch.password_hash = "<managed-internal>";
  }

  const filter = {
    ...buildScopeFilter(ouId, branchId),
    user_id: userId,
  };

  const doc = await collection().findOneAndUpdate(
    filter,
    { $set: setPatch },
    { returnDocument: "after" },
  );
  return doc || null;
}

async function removeMember({ ouId, branchId, userId }) {
  const result = await collection().deleteOne({
    ...buildScopeFilter(ouId, branchId),
    user_id: userId,
  });
  return result.deletedCount;
}

module.exports = {
  listMembers,
  createMember,
  findMemberByUserId,
  updateMember,
  removeMember,
  mapMember,
};
