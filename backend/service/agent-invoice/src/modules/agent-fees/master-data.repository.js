export const getGameCompanies = async (sourceDb) => {
  return sourceDb.collection('game_company').find({}).toArray();
};

export const getGameCategories = async (sourceDb) => {
  return sourceDb.collection('game_main_category').find({}).toArray();
};
