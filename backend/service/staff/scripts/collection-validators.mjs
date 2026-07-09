export const STAFF_PROFILES_JSON_SCHEMA = {
  bsonType: "object",
  required: [
    "user_id",
    "ou_id",
    "branch_id",
    "status",
    "code",
    "firstname",
    "lastname",
    "email",
    "tel",
    "cr_by",
    "cr_date",
    "cr_prog",
    "upd_by",
    "upd_date",
    "upd_prog",
  ],
  properties: {
    status: { enum: ["active", "archived"] },
    code: { bsonType: "string", minLength: 1, maxLength: 32 },
    firstname: { bsonType: "string", minLength: 1, maxLength: 128 },
    lastname: { bsonType: "string", minLength: 1, maxLength: 128 },
    email: { bsonType: "string", maxLength: 254 },
    tel: { bsonType: "string", maxLength: 16 },
  },
};

/** @type {Array<{ collection: string, schema: object }>} */
export const COLLECTION_VALIDATORS = [
  {
    collection: "staff_profiles",
    schema: STAFF_PROFILES_JSON_SCHEMA,
  },
];
