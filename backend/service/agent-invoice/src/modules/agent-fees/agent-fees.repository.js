import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agent_fees';

export const findByTargetBranchId = async (db, ouId, targetBranchId, skip = 0, limit = 20) => {
  const fees = await db.collection(COLLECTION_NAME)
    .find({
      ou_id: new ObjectId(ouId),
      branch_id: targetBranchId
    })
    .skip(skip)
    .limit(limit)
    .toArray();
    
  return fees.map(fee => ({
    ...fee,
    _id: fee._id?.toString(),
    ou_id: fee.ou_id?.toString(),
    game_company_id: fee.game_company_id?.toString(),
    game_main_cate_id: fee.game_main_cate_id?.toString()
  }));
};

export const countByTargetBranchId = async (db, ouId, targetBranchId) => {
  return db.collection(COLLECTION_NAME).countDocuments({
    ou_id: new ObjectId(ouId),
    branch_id: targetBranchId
  });
};

export const findByUniqueFields = async (db, ouId, targetBranchId, gameCompanyId, gameMainCateId) => {
  return db.collection(COLLECTION_NAME).findOne({
    ou_id: new ObjectId(ouId),
    branch_id: targetBranchId,
    game_company_id: new ObjectId(gameCompanyId),
    game_main_cate_id: new ObjectId(gameMainCateId)
  });
};

export const createFee = async (db, feeData) => {
  return db.collection(COLLECTION_NAME).insertOne(feeData);
};

export const updateFee = async (db, feeId, ouId, targetBranchId, previousUpdDate, updateData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(feeId),
      ou_id: new ObjectId(ouId),
      branch_id: targetBranchId,
      upd_date: new Date(previousUpdDate)
    },
    { $set: updateData }
  );
};

export const deleteFee = async (db, feeId, ouId, targetBranchId, updDateStr) => {
  return db.collection(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(feeId),
    ou_id: new ObjectId(ouId),
    branch_id: targetBranchId,
    upd_date: new Date(updDateStr)
  });
};
