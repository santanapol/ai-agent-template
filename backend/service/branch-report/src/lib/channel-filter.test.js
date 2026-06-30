import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { describe, it } from 'node:test';

import {
  buildMemberChannelFilter,
  buildMemberReportFilter,
  CHANNEL_TYPES,
} from './channel-filter.js';

const OU_ID = '507f1f77bcf86cd799439011';
const BRANCH_ID = '507f1f77bcf86cd799439012';
const INVITE_LINK_ID = '507f1f77bcf86cd799439013';

const REG_FROM = '2024-06-01';
const REG_TO = '2024-06-30';

describe('buildMemberChannelFilter', () => {
  const tenant = { ouId: OU_ID, branchId: BRANCH_ID };

  it('builds affiliate_link filter with referral_staff_link_id', () => {
    const filter = buildMemberChannelFilter({
      ...tenant,
      channelType: 'affiliate_link',
      inviteLinkId: INVITE_LINK_ID,
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral_staff_link_id: new ObjectId(INVITE_LINK_ID),
    });
  });

  it('builds member_referral filter', () => {
    const filter = buildMemberChannelFilter({
      ...tenant,
      channelType: 'member_referral',
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: 'Member',
    });
  });

  it('builds direct filter', () => {
    const filter = buildMemberChannelFilter({
      ...tenant,
      channelType: 'direct',
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: 'Branch',
    });
  });

  it('requires inviteLinkId for affiliate_link', () => {
    assert.throws(
      () =>
        buildMemberChannelFilter({
          ...tenant,
          channelType: 'affiliate_link',
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_PARAM');
        return true;
      },
    );
  });

  it('rejects invalid inviteLinkId for affiliate_link', () => {
    assert.throws(
      () =>
        buildMemberChannelFilter({
          ...tenant,
          channelType: 'affiliate_link',
          inviteLinkId: 'not-an-object-id',
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_PARAM');
        return true;
      },
    );
  });

  it('rejects invalid channelType', () => {
    assert.throws(
      () =>
        buildMemberChannelFilter({
          ...tenant,
          channelType: 'unknown',
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_PARAM');
        return true;
      },
    );
  });

  it('exports allowed channel types', () => {
    assert.deepEqual(CHANNEL_TYPES, [
      'affiliate_link',
      'member_referral',
      'direct',
    ]);
  });
});

describe('buildMemberReportFilter', () => {
  const tenant = { ouId: OU_ID, branchId: BRANCH_ID };

  it('merges channel filter with inclusive UTC reg_date bounds', () => {
    const filter = buildMemberReportFilter({
      ...tenant,
      channelType: 'member_referral',
      regDateFrom: REG_FROM,
      regDateTo: REG_TO,
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: 'Member',
      reg_date: {
        $gte: new Date(`${REG_FROM}T00:00:00.000Z`),
        $lte: new Date(`${REG_TO}T23:59:59.999Z`),
      },
    });
  });

  it('rejects inverted reg date range', () => {
    assert.throws(
      () =>
        buildMemberReportFilter({
          ...tenant,
          channelType: 'direct',
          regDateFrom: '2024-06-30',
          regDateTo: '2024-06-01',
        }),
      (error) => error.code === 'INVALID_PARAM',
    );
  });
});
