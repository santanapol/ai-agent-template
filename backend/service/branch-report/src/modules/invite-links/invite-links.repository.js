import { parseObjectId } from "../../lib/param-error.js";

const COLLECTION = "su_staff_invite_link";

/**
 * @param {import('mongodb').Document} doc
 */
export function mapInviteLinkDoc(doc) {
  return {
    id: doc._id.toString(),
    inviteCode: String(doc.invite_code ?? ""),
    username: String(doc.username ?? ""),
    description: String(doc.description ?? ""),
  };
}

/**
 * @param {() => import('mongodb').Db} getDb
 */
export function createInviteLinksRepository(getDb) {
  return {
    /**
     * @param {{ ouId: string; branchId: string; q?: string; limit?: number }} tenant
     */
    async findByTenant(tenant) {
      const ouId = parseObjectId(tenant.ouId, "ou_id");
      const branchId = parseObjectId(tenant.branchId, "branch_id");

      const filter = {
        ou_id: ouId,
        branch_id: branchId,
      };

      const q = tenant.q?.trim();
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
          { invite_code: regex },
          { username: regex },
          { description: regex },
        ];
      }

      let cursor = getDb()
        .collection(COLLECTION)
        .find(filter)
        .sort({ invite_code: 1 });
      if (tenant.limit !== undefined && tenant.limit !== null) {
        cursor = cursor.limit(Math.min(Math.max(1, Number(tenant.limit)), 100));
      }

      const docs = await cursor.toArray();

      return { filter, docs };
    },

    /**
     * @param {{ ouId: string; branchId: string; inviteLinkId: string }} tenant
     */
    async existsForTenant(tenant) {
      const filter = {
        ou_id: parseObjectId(tenant.ouId, "ou_id"),
        branch_id: parseObjectId(tenant.branchId, "branch_id"),
        _id: parseObjectId(tenant.inviteLinkId, "inviteLinkId"),
      };

      const doc = await getDb()
        .collection(COLLECTION)
        .findOne(filter, { projection: { _id: 1 } });

      return Boolean(doc);
    },
  };
}

export { COLLECTION };
