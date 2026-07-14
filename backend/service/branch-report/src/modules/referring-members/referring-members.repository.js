import { parseObjectId } from "../../lib/param-error.js";

const COLLECTION = "member";

/**
 * @param {import('mongodb').Document} doc
 */
export function mapReferringMemberDoc(doc) {
  return {
    id: doc._id.toString(),
    username: String(doc.username ?? ""),
  };
}

/**
 * @param {() => import('mongodb').Db} getDb
 */
export function createReferringMembersRepository(getDb) {
  return {
    /**
     * Exact username match for a member who referred at least one Member-channel signup
     * in this tenant.
     * @param {{ ouId: string; branchId: string; username: string }} tenant
     */
    async findReferrerByExactUsername(tenant) {
      const ouId = parseObjectId(tenant.ouId, "ou_id");
      const branchId = parseObjectId(tenant.branchId, "branch_id");
      const username = tenant.username.trim();
      if (!username) {
        return { doc: null };
      }

      const referrer = await getDb()
        .collection(COLLECTION)
        .findOne(
          { ou_id: ouId, branch_id: branchId, username },
          { projection: { _id: 1, username: 1 } },
        );

      if (!referrer) {
        return { doc: null };
      }

      const usedAsReferrer = await getDb()
        .collection(COLLECTION)
        .findOne(
          {
            ou_id: ouId,
            branch_id: branchId,
            referral: "Member",
            referral_uid: referrer._id,
          },
          { projection: { _id: 1 } },
        );

      if (!usedAsReferrer) {
        return { doc: null };
      }

      return { doc: referrer };
    },

    /**
     * @param {{ ouId: string; branchId: string; referralUid: string }} tenant
     */
    async existsAsReferrerForTenant(tenant) {
      const filter = {
        ou_id: parseObjectId(tenant.ouId, "ou_id"),
        branch_id: parseObjectId(tenant.branchId, "branch_id"),
        referral: "Member",
        referral_uid: parseObjectId(tenant.referralUid, "referralUid"),
      };

      const doc = await getDb()
        .collection(COLLECTION)
        .findOne(filter, { projection: { _id: 1 } });

      return Boolean(doc);
    },
  };
}

export { COLLECTION };
