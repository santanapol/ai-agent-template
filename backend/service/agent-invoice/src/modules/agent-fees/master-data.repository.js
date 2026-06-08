import { ObjectId } from 'mongodb';

export const getGameCompanies = async (sourceDb, ou_id) => {
  const filter = { active: '1' };
  if (ou_id) {
    filter.ou_id = new ObjectId(ou_id);
  }
  const items = await sourceDb.collection('game_company').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, provider_name: 1, active: 1 }
  }).toArray();
  return items.map(item => ({ ...item, _id: item._id?.toString(), ou_id: item.ou_id?.toString() }));
};

export const getGameCategories = async (sourceDb, ou_id) => {
  const filter = { active: '1' };
  if (ou_id) {
    filter.ou_id = new ObjectId(ou_id);
  }
  const items = await sourceDb.collection('game_main_category').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, main_cate_name: 1, active: 1 }
  }).toArray();
  return items.map(item => ({ ...item, _id: item._id?.toString(), ou_id: item.ou_id?.toString() }));
};
