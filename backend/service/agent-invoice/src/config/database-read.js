import { MongoClient } from "mongodb";

import { READ_DB_OPTIONS } from "./database-options.js";

let client = null;
/** @type {import('mongodb').Db | null} */
let branchDb = null;
/** @type {import('mongodb').Db | null} */
let orgDataDb = null;

function resolveConfig() {
  const uri = process.env.MONGODB_URI_READ ?? process.env.MONGODB_URI_BRANCH;
  const branchName = process.env.MONGODB_DB_BRANCH;
  const orgDataName =
    process.env.MONGODB_DB_ORG_DATA ?? process.env.MONGODB_DB_ORG;

  if (!uri || !branchName || !orgDataName) {
    throw new Error(
      "[Database] Missing MONGODB_URI_READ, MONGODB_DB_BRANCH, MONGODB_DB_ORG_DATA (or legacy MONGODB_URI_BRANCH / MONGODB_DB_ORG).",
    );
  }

  return { uri, branchName, orgDataName };
}

/**
 * Read API connection — cross-database reads on same cluster (`readPreference: secondaryPreferred`).
 * - `gpp_777ww`: `su_branch`, `su_organization`, `game_company`, `game_main_category` (txn list master names)
 * - `gpp_org_data`: `member_bet_dau_summary`, `su_ou`, `su_company`, `su_main_category` (list/detail master)
 */
export async function connectReadDatabase() {
  if (branchDb && orgDataDb) {
    return { branchDb, orgDataDb };
  }

  const { uri, branchName, orgDataName } = resolveConfig();
  client = new MongoClient(uri, READ_DB_OPTIONS);
  await client.connect();
  branchDb = client.db(branchName);
  orgDataDb = client.db(orgDataName);
  return { branchDb, orgDataDb };
}

export function getBranchDatabase() {
  if (!branchDb)
    throw new Error("[Database] Call connectReadDatabase() first.");
  return branchDb;
}

export function getOrgDataDatabase() {
  if (!orgDataDb)
    throw new Error("[Database] Call connectReadDatabase() first.");
  return orgDataDb;
}

/** @deprecated Use connectReadDatabase */
export async function connectBranchDatabase() {
  await connectReadDatabase();
  return getBranchDatabase();
}

export async function closeReadDatabase() {
  if (client) {
    await client.close();
    client = null;
    branchDb = null;
    orgDataDb = null;
  }
}

export async function pingReadDatabase() {
  await getBranchDatabase().command({ ping: 1 });
  await getOrgDataDatabase().command({ ping: 1 });
}
