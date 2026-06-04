export const getGameCompanies = async (sourceDb, ou_id) => {
  const filter = ou_id ? { ou_id, active: '1' } : { active: '1' };
  return sourceDb.collection('game_company').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, provider_name: 1, active: 1 }
  }).toArray();
};

export const getGameCategories = async (sourceDb, ou_id) => {
  const filter = ou_id ? { ou_id, active: '1' } : { active: '1' };
  return sourceDb.collection('game_main_category').find(filter, {
    projection: { _id: 1, ou_id: 1, name: 1, manin_cate_name: 1, active: 1 }
  }).toArray();
};
