/** @type {Array<{ collection: string, schema: object }>} */
export const COLLECTION_VALIDATORS = [
  {
    collection: "reports",
    schema: {
      bsonType: "object",
      required: ["name", "script", "enabled", "outputFormat"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
        script: { bsonType: "string" },
        enabled: { bsonType: "bool" },
        outputFormat: { enum: ["csv", "excel"] },
        params: { bsonType: ["object", "null"] },
      },
    },
  },
  {
    collection: "download_history",
    schema: {
      bsonType: "object",
      required: ["reportId", "startedAt", "status"],
      properties: {
        reportId: { bsonType: "objectId" },
        startedAt: { bsonType: "date" },
        finishedAt: { bsonType: ["date", "null"] },
        status: { bsonType: "string", minLength: 1 },
        format: { enum: ["csv", "excel", null] },
      },
    },
  },
];
