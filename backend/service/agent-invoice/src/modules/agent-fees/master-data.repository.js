import { ObjectId } from 'mongodb';

import { getBranchDatabase } from '../../config/database-read.js';

function buildOuFilter(ou_id) {
  const filter = { active: '1' };
  if (ou_id) {
    try {
      filter.ou_id = new ObjectId(ou_id);
    } catch {
      filter.ou_id = ou_id;
    }
  }
  return filter;
}

export async function getGameCompanies(ou_id) {
  const db = getBranchDatabase();
  const items = await db.collection('game_company').find(buildOuFilter(ou_id), {
    projection: { _id: 1, ou_id: 1, name: 1, provider_name: 1, active: 1 },
  }).toArray();
  return items.map((item) => ({
    ...item,
    _id: item._id?.toString(),
    ou_id: item.ou_id?.toString(),
  }));
}

export async function getGameCategories(ou_id) {
  const db = getBranchDatabase();
  const items = await db.collection('game_main_category').find(buildOuFilter(ou_id), {
    projection: { _id: 1, ou_id: 1, name: 1, manin_cate_name: 1, active: 1 },
  }).toArray();
  return items.map((item) => ({
    ...item,
    _id: item._id?.toString(),
    ou_id: item.ou_id?.toString(),
  }));
}
