import { jest } from '@jest/globals';

const mockInsertOne = jest.fn();

await jest.unstable_mockModule('../../src/models/items.model.js', () => ({
  insertOne: mockInsertOne,
  COLLECTION_NAME: 'items',
  ensureItemIndexes: jest.fn(),
}));

const { createItem } = await import('../../src/services/items.service.js');

describe('createItem service', () => {
  beforeEach(() => {
    mockInsertOne.mockReset();
  });

  it('creates an item with tenant and audit fields', async () => {
    const savedDocument = {
      _id: '665a1b2c3d4e5f6789012345',
      name: 'Widget A',
      desc: 'desc',
      cr_by: 'user-001',
      cr_date: new Date('2026-05-27T10:00:00.000Z'),
      upd_by: 'user-001',
      upd_date: new Date('2026-05-27T10:00:00.000Z'),
    };

    mockInsertOne.mockResolvedValue(savedDocument);

    const result = await createItem({
      ouId: '665a1b2c3d4e5f6789012345',
      branchId: '665a1b2c3d4e5f6789012346',
      userId: 'user-001',
      body: { name: 'Widget A', desc: 'desc' },
    });

    expect(result).toEqual(savedDocument);
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Widget A',
        desc: 'desc',
        cr_by: 'user-001',
        upd_by: 'user-001',
        cr_prog: 'POST /api/v1/items',
        upd_prog: 'POST /api/v1/items',
      }),
    );
  });

  it('maps duplicate key errors to DUPLICATE', async () => {
    const duplicateError = new Error('duplicate');
    duplicateError.code = 11000;
    mockInsertOne.mockRejectedValue(duplicateError);

    await expect(
      createItem({
        ouId: '665a1b2c3d4e5f6789012345',
        branchId: '665a1b2c3d4e5f6789012346',
        userId: 'user-001',
        body: { name: 'Widget A' },
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'DUPLICATE',
    });
  });

  it('rethrows unexpected database errors', async () => {
    const dbError = new Error('connection failed');
    mockInsertOne.mockRejectedValue(dbError);

    await expect(
      createItem({
        ouId: '665a1b2c3d4e5f6789012345',
        branchId: '665a1b2c3d4e5f6789012346',
        userId: 'user-001',
        body: { name: 'Widget A' },
      }),
    ).rejects.toThrow('connection failed');
  });
});
