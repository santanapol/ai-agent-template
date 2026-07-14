import {
  CHANNEL_TYPES,
  createParamError,
  parseObjectId,
} from "./param-error.js";
import { parseRegDateRange } from "./reg-date-range.js";

export { CHANNEL_TYPES, createParamError };

/**
 * @param {{
 *   ouId: string;
 *   branchId: string;
 *   channelType: string;
 *   inviteLinkId?: string;
 *   referralUid?: string;
 *   regDateFrom: string;
 *   regDateTo: string;
 * }} input
 * @returns {import('mongodb').Filter<import('mongodb').Document>}
 */
export function buildMemberReportFilter(input) {
  const channelFilter = buildMemberChannelFilter(input);
  const regDateFilter = parseRegDateRange(input.regDateFrom, input.regDateTo);

  return {
    ...channelFilter,
    ...regDateFilter,
  };
}

/**
 * @param {{
 *   ouId: string;
 *   branchId: string;
 *   channelType: string;
 *   inviteLinkId?: string;
 *   referralUid?: string;
 * }} input
 * @returns {import('mongodb').Filter<import('mongodb').Document>}
 */
export function buildMemberChannelFilter(input) {
  const { ouId, branchId, channelType, inviteLinkId, referralUid } = input;

  const base = {
    ou_id: parseObjectId(ouId, "ou_id"),
    branch_id: parseObjectId(branchId, "branch_id"),
  };

  if (!CHANNEL_TYPES.includes(channelType)) {
    throw createParamError(400, "INVALID_PARAM", "Invalid channelType");
  }

  if (channelType === "affiliate_link") {
    if (!inviteLinkId) {
      throw createParamError(
        400,
        "INVALID_PARAM",
        "inviteLinkId is required for affiliate_link",
      );
    }

    return {
      ...base,
      referral_staff_link_id: parseObjectId(inviteLinkId, "inviteLinkId"),
    };
  }

  if (channelType === "member_referral") {
    if (!referralUid) {
      throw createParamError(
        400,
        "INVALID_PARAM",
        "referralUid is required for member_referral",
      );
    }

    return {
      ...base,
      referral: "Member",
      referral_uid: parseObjectId(referralUid, "referralUid"),
    };
  }

  return {
    ...base,
    referral: "Branch",
  };
}
