const targetDB = db.getSiblingDB("demo");
const startDate = ISODate(params.startDate);
const endDate = ISODate(params.endDate);

targetDB.users.find({
  created_at: { $gte: startDate, $lte: endDate },
});
