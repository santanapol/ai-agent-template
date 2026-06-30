import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { describe, it } from 'node:test';

import { createRoyalty21TimesService } from './royalty-21-times.service.js';

const userContext = {
  ouId: '507f1f77bcf86cd799439011',
  branchId: '507f1f77bcf86cd799439012',
};

describe('createRoyalty21TimesService', () => {
  it('maps members and metrics into report rows', async () => {
    const memId = new ObjectId();
    const regDate = new Date('2024-06-15T10:30:00Z');

    const repository = {
      async findMembersPage() {
        return {
          members: [{ _id: memId, username: '7W001', reg_date: regDate }],
        };
      },
      async countMembers() {
        return { total: 1 };
      },
      async fetchMemberMetrics() {
        return new Map([
          [
            memId.toString(),
            {
              billin: 15000,
              withdraw: 5000,
              promotion: 0,
              revenue: 10000,
              deposits: [100, 200, 500, ...Array(18).fill(0)],
            },
          ],
        ]);
      },
    };

    const inviteLinksRepository = {
      async existsForTenant() {
        return true;
      },
    };

    const service = createRoyalty21TimesService(repository, inviteLinksRepository);
    const result = await service.getReport({
      userContext,
      query: {
        channelType: 'member_referral',
        regDateFrom: '2024-06-01',
        regDateTo: '2024-06-30',
        page: 1,
        pageSize: 50,
      },
    });

    assert.equal(result.pagination.total, 1);
    assert.deepEqual(result.data, [
      {
        username: '7W001',
        register: '15/06/2024',
        billin: 15000,
        withdraw: 5000,
        promotion: 0,
        revenue: 10000,
        deposits: [100, 200, 500, ...Array(18).fill(0)],
      },
    ]);
  });
});
