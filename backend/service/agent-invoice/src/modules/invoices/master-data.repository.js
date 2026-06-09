import { ObjectId } from "mongodb";

import {
  getBranchDatabase,
  getOrgDataDatabase,
} from "../../config/database-read.js";

/**
 * @param {string} branchId
 */
export async function findBranchDisplayName(branchId) {
  const db = getBranchDatabase();
  const doc = await db
    .collection("su_branch")
    .findOne(
      { _id: new ObjectId(branchId) },
      { projection: { branch_name: 1, branch_code: 1 } },
    );
  if (!doc) return null;
  return doc.branch_name ?? doc.branch_code ?? null;
}

/**
 * @param {string} ouId
 */
export async function findOuDisplayName(ouId) {
  const db = getOrgDataDatabase();
  const doc = await db
    .collection("su_ou")
    .findOne(
      { _id: new ObjectId(ouId) },
      { projection: { ou_name: 1, name: 1 } },
    );
  if (!doc) return null;
  return doc.ou_name ?? doc.name ?? null;
}

/**
 * @param {import('mongodb').ObjectId[]} companyIds
 */
export async function findCompanyNamesByIds(companyIds) {
  if (companyIds.length === 0) return new Map();
  const db = getOrgDataDatabase();
  const rows = await db
    .collection("su_company")
    .find(
      { _id: { $in: companyIds } },
      { projection: { company_name: 1, name: 1 } },
    )
    .toArray();
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), row.company_name ?? row.name ?? null);
  }
  return map;
}

/**
 * @param {import('mongodb').ObjectId[]} categoryIds
 */
export async function findMainCategoryNamesByIds(categoryIds) {
  if (categoryIds.length === 0) return new Map();
  const db = getOrgDataDatabase();
  const rows = await db
    .collection("su_main_category")
    .find(
      { _id: { $in: categoryIds } },
      { projection: { main_category_name: 1, name: 1 } },
    )
    .toArray();
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), row.main_category_name ?? row.name ?? null);
  }
  return map;
}

/**
 * @param {string} ouId
 */
export async function findOrganizationNameByOuId(ouId) {
  const db = getBranchDatabase();
  const doc = await db
    .collection("su_organization")
    .findOne({ _id: new ObjectId(ouId) }, { projection: { ou_name: 1 } });
  return doc?.ou_name ?? null;
}

/**
 * @param {import('mongodb').ObjectId[]} companyIds
 */
export async function findGameCompanyNamesByIds(companyIds) {
  if (companyIds.length === 0) return new Map();
  const db = getBranchDatabase();
  const rows = await db
    .collection("game_company")
    .find({ _id: { $in: companyIds } }, { projection: { name: 1 } })
    .toArray();
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), row.name ?? null);
  }
  return map;
}

/**
 * @param {import('mongodb').ObjectId[]} categoryIds
 */
export async function findGameMainCategoryNamesByIds(categoryIds) {
  if (categoryIds.length === 0) return new Map();
  const db = getBranchDatabase();
  const rows = await db
    .collection("game_main_category")
    .find({ _id: { $in: categoryIds } }, { projection: { key_name: 1 } })
    .toArray();
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), row.key_name ?? null);
  }
  return map;
}
