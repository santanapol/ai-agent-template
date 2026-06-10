import { ObjectId } from "mongodb";

import { getBranchDatabase } from "../../config/database-read.js";

const COLLECTION = "su_branch";

/**

 * Branches with no IANA timezone (null / missing / empty string).

 * @param {unknown} timezone

 */

export function isMissingTimezone(timezone) {
  return timezone === null || timezone === undefined || timezone === "";
}

/**

 * Mongo match for batch generate: scope branches to one timezone bucket.

 * @param {{ timezone: unknown, branchIdsWithPlay: string[], ouId?: string }} params

 */

export function buildBatchBranchMatch({ timezone, branchIdsWithPlay, ouId }) {
  const playIds = branchIdsWithPlay.map((id) => new ObjectId(id));

  const eligibility = {
    $or: [{ active: "1" }, { _id: { $in: playIds } }],
  };

  if (isMissingTimezone(timezone)) {
    /** @type {import('mongodb').Filter<import('mongodb').Document>} */

    const match = {
      $and: [
        {
          $or: [
            { timezone: null },
            { timezone: { $exists: false } },
            { timezone: "" },
          ],
        },

        eligibility,
      ],
    };

    if (ouId) {
      match.ou_id = new ObjectId(ouId);
    }

    return match;
  }

  const match = {
    timezone,

    ...eligibility,
  };

  if (ouId) {
    match.ou_id = new ObjectId(ouId);
  }

  return match;
}

export async function findBranchById(branchId) {
  const db = getBranchDatabase();

  return db.collection(COLLECTION).findOne({
    _id: new ObjectId(branchId),
  });
}

/**

 * @param {string} ouId

 * @returns {Promise<Array<{ branch_id: string, branch_name: string | null, branch_code: string | null }>>}

 */

export async function findBranchesByOuId(ouId) {
  const db = getBranchDatabase();

  const rows = await db

    .collection(COLLECTION)

    .find({ ou_id: new ObjectId(ouId) })

    .project({ branch_name: 1, branch_code: 1 })

    .sort({ branch_name: 1 })

    .toArray();

  return rows.map((row) => ({
    branch_id: String(row._id),

    branch_name: row.branch_name ?? null,

    branch_code: row.branch_code ?? null,
  }));
}

export async function distinctTimezoneGroups(ouId) {
  const db = getBranchDatabase();

  /** @type {import('mongodb').Document[]} */

  const pipeline = [];

  if (ouId) {
    pipeline.push({ $match: { ou_id: new ObjectId(ouId) } });
  }

  pipeline.push(
    {
      $group: {
        _id: { ou_id: "$ou_id", timezone: "$timezone" },
      },
    },

    {
      $project: {
        _id: 0,

        ou_id: "$_id.ou_id",

        timezone: "$_id.timezone",
      },
    },
  );

  return db.collection(COLLECTION).aggregate(pipeline).toArray();
}

export async function groupBranches({
  branchId,

  branchIdsWithPlay = [],

  timezone = null,

  ouId,
}) {
  const db = getBranchDatabase();

  const match = branchId
    ? { _id: new ObjectId(branchId) }
    : buildBatchBranchMatch({ timezone, branchIdsWithPlay, ouId });

  if (ouId) {
    match.ou_id = new ObjectId(ouId);
  }

  return db

    .collection(COLLECTION)

    .aggregate([
      { $match: match },

      {
        $group: {
          _id: { ou_id: "$ou_id", timezone: "$timezone" },

          branch_id: { $push: "$_id" },
        },
      },

      {
        $project: {
          _id: 0,

          ou_id: "$_id.ou_id",

          timezone: "$_id.timezone",

          branch_id: 1,
        },
      },
    ])

    .toArray();
}
