"use strict";

const { ObjectId } = require("mongodb");
const { getDatabase } = require("../../config/database");

function nowIso() {
  return new Date().toISOString();
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

function scopeFilter(ouId, branchId) {
  return {
    ou_id: toTenantId(ouId),
    branch_id: toTenantId(branchId),
  };
}

function profilesCollection() {
  return getDatabase().collection("billing_profiles");
}

function invoicesCollection() {
  return getDatabase().collection("billing_invoices");
}

async function getPlan(ouId, branchId) {
  const existing = await profilesCollection().findOne(
    scopeFilter(ouId, branchId),
  );
  if (existing) {
    return {
      planCode: existing.plan_code,
      status: existing.status,
      updatedAt: existing.updated_at,
    };
  }

  return {
    planCode: "starter",
    status: "active",
    updatedAt: nowIso(),
  };
}

async function listInvoices(ouId, branchId, { page, limit }) {
  const filter = scopeFilter(ouId, branchId);
  const skip = (page - 1) * limit;
  const [total, docs] = await Promise.all([
    invoicesCollection().countDocuments(filter),
    invoicesCollection()
      .find(filter)
      .sort({ issued_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  return {
    invoices: docs.map((doc) => ({
      invoiceId: String(doc.invoice_id),
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      issuedAt: doc.issued_at,
      dueAt: doc.due_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function updatePlan(ouId, branchId, { planCode }, actorUserId) {
  const current = nowIso();
  const filter = scopeFilter(ouId, branchId);
  await profilesCollection().updateOne(
    filter,
    {
      $set: {
        plan_code: planCode,
        status: "active",
        updated_at: current,
        updated_by: actorUserId,
      },
      $setOnInsert: {
        created_at: current,
      },
    },
    { upsert: true },
  );

  return {
    planCode,
    status: "active",
    updatedAt: current,
  };
}

module.exports = {
  getPlan,
  listInvoices,
  updatePlan,
};
