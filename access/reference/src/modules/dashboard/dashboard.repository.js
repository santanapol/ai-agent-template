"use strict";

const { getDatabase } = require("../../config/database");

function toTenantId(value) {
  if (
    typeof value === "string" &&
    value.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(value)
  ) {
    const { ObjectId } = require("mongodb");
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

async function getSummaryData(ouId, branchId) {
  const filter = scopeFilter(ouId, branchId);
  const [itemsTotal, membersTotal, openInvoicesTotal] = await Promise.all([
    getDatabase().collection("items").countDocuments(filter),
    getDatabase().collection("members").countDocuments(filter),
    getDatabase()
      .collection("billing_invoices")
      .countDocuments({ ...filter, status: "open" }),
  ]);

  return {
    itemsTotal,
    membersTotal,
    openInvoicesTotal,
    refreshedAt: new Date().toISOString(),
  };
}

module.exports = {
  getSummaryData,
};
