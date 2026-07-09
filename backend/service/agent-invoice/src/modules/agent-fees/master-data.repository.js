import { ObjectId } from "mongodb";

import { getBranchDatabase } from "../../config/database-read.js";

function buildOuFilter(ouId) {
  const filter = { active: "1" };
  if (ouId) {
    filter.ou_id = new ObjectId(ouId);
  }
  return filter;
}

export async function getGameCompanies(ouId, { fields = "full" } = {}) {
  const db = getBranchDatabase();
  const isMatrix = fields === "matrix";
  const projection = isMatrix
    ? { _id: 1, "provider_name.en": 1 }
    : { _id: 1, ou_id: 1, name: 1, provider_name: 1, active: 1 };
  const items = await db
    .collection("game_company")
    .find(buildOuFilter(ouId), { projection })
    .toArray();

  if (isMatrix) {
    return items.map((item) => ({
      _id: item._id?.toString(),
      provider_name: { en: item.provider_name?.en ?? null },
    }));
  }

  return items.map((item) => ({
    ...item,
    _id: item._id?.toString(),
    ou_id: item.ou_id?.toString(),
  }));
}

export async function getGameCategories(ouId) {
  const db = getBranchDatabase();
  const items = await db
    .collection("game_main_category")
    .find(buildOuFilter(ouId), {
      projection: {
        _id: 1,
        ou_id: 1,
        name: 1,
        main_cate_name: 1,
        manin_cate_name: 1,
        active: 1,
      },
    })
    .toArray();
  return items.map((item) => ({
    ...item,
    _id: item._id?.toString(),
    ou_id: item.ou_id?.toString(),
  }));
}
