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
     * @param {{ ouId: string; branchId: string }} tenant
     */
    async findByTenant(tenant) {
      const ouId = parseObjectId(tenant.ouId, "ou_id");
      const branchId = parseObjectId(tenant.branchId, "branch_id");

      const filter = {
        ou_id: ouId,
        branch_id: branchId,
      };

      const docs = await getDb()
        .collection(COLLECTION)
        .find(filter)
        .sort({ invite_code: 1 })
        .toArray();

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
