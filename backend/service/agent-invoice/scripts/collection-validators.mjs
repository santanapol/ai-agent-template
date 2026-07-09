/** @type {Array<{ collection: string, schema: object }>} */
export const COLLECTION_VALIDATORS = [
  {
    collection: "agents",
    schema: {
      bsonType: "object",
      required: ["ou_id", "branch_id"],
      properties: {
        ou_id: { bsonType: "objectId" },
        branch_id: { bsonType: "objectId" },
        branch_type: { enum: ["MA", "AG", null] },
        active: { bsonType: ["bool", "int", "long", "double", "null"] },
        parent_branch_id: { bsonType: ["objectId", "null"] },
        ref_fee_branch_id: { bsonType: ["objectId", "null"] },
      },
    },
  },
  {
    collection: "agent_iv",
    schema: {
      bsonType: "object",
      required: ["iv_no", "ou_id", "branch_id", "billing_month"],
      properties: {
        iv_no: { bsonType: "string", minLength: 1 },
        ou_id: { bsonType: "objectId" },
        branch_id: { bsonType: "objectId" },
        billing_month: { bsonType: "string", minLength: 1 },
        status: { bsonType: "string" },
      },
    },
  },
  {
    collection: "agent_iv_transaction",
    schema: {
      bsonType: "object",
      required: ["ref_iv_id", "company_id", "main_category_id"],
      properties: {
        ref_iv_id: { bsonType: "objectId" },
        company_id: { bsonType: "objectId" },
        main_category_id: { bsonType: "objectId" },
        ou_id: { bsonType: "objectId" },
        branch_id: { bsonType: "objectId" },
        fee: { bsonType: ["double", "int", "long", "null"] },
      },
    },
  },
  {
    collection: "agent_fees",
    schema: {
      bsonType: "object",
      required: [
        "ou_id",
        "branch_id",
        "game_company_id",
        "game_main_cate_id",
        "agent_fee",
        "cr_by",
        "cr_date",
        "cr_prog",
        "upd_by",
        "upd_date",
        "upd_prog",
      ],
      properties: {
        ou_id: { bsonType: "objectId" },
        branch_id: { bsonType: "objectId" },
        game_company_id: { bsonType: "objectId" },
        game_main_cate_id: { bsonType: "objectId" },
        gcomp_cost: { bsonType: ["double", "int", "long"] },
        agent_known_fee: { bsonType: ["double", "int", "long"] },
        agent_fee: { bsonType: ["double", "int", "long"] },
        cr_by: { bsonType: "string", minLength: 1 },
        cr_date: { bsonType: "date" },
        cr_prog: { bsonType: "string", minLength: 1 },
        upd_by: { bsonType: "string", minLength: 1 },
        upd_date: { bsonType: "date" },
        upd_prog: { bsonType: "string", minLength: 1 },
      },
    },
  },
];
