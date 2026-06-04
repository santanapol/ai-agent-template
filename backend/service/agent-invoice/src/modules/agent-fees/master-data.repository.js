import { ObjectId } from 'mongodb';

export const getGameCompanies = async (sourceDb, ou_id) => {
  const filter = { active: '1' };
  if (ou_id) {
    try { filter.ou_id = new ObjectId(ou_id); } catch { filter.ou_id = ou_id; }
  }
  return sourceDb.collection('game_company').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, provider_name: 1, active: 1 }
  }).toArray();
};

export const getGameCategories = async (sourceDb, ou_id) => {
  const filter = { active: '1' };
  if (ou_id) {
    try { filter.ou_id = new ObjectId(ou_id); } catch { filter.ou_id = ou_id; }
  }
  return sourceDb.collection('game_main_category').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, manin_cate_name: 1, active: 1 }
  }).toArray();
};
