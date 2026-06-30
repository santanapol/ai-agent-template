const targetDB = db.getSiblingDB("gpp_777ww");
const startDate = ISODate(params.startDate);
const endDate = ISODate(params.endDate);

targetDB.dm_dm_tn_deposit.aggregate([
  { $match: { created_at: { $gte: startDate, $lte: endDate } } },
  { $project: { _id: 0, amount: 1 } },
]);
