const mainDB = db.getSiblingDB("gpp_777ww");
const rows = mainDB.member
  .aggregate([
    { $match: { status: "active" } },
    { $project: { _id: 0, username: 1 } },
  ])
  .toArray();
let result = [];
if (rows.length > 0) {
  const attrs = mainDB.member_attribute.find({ type: "vip" }).toArray();
  result = rows.map((row) => ({
    username: row.username,
    vip: attrs.length > 0,
  }));
}
result;
