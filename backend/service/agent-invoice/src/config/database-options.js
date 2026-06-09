export const DB_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  writeConcern: { w: "majority", j: true, wtimeoutMS: 5000 },
  readPreference: "primaryPreferred",
};

/** Read-only cross-DB client (bet summary, su_branch, master lookups). */
export const READ_DB_OPTIONS = {
  ...DB_OPTIONS,
  readPreference: "secondaryPreferred",
};
