/**
 * Shared collMod / createCollection helper for $jsonSchema validators.
 * @param {import('mongodb').Db} db
 * @param {string} collection
 * @param {object} schema — $jsonSchema body (without wrapper)
 */
export async function applyCollectionValidator(db, collection, schema) {
  const validator = { $jsonSchema: schema };
  try {
    await db.command({
      collMod: collection,
      validator,
      validationLevel: "moderate",
    });
    console.log(`  ✔ ${db.databaseName}.${collection} collMod`);
  } catch (error) {
    if (error.codeName === "NamespaceNotFound") {
      await db.createCollection(collection, {
        validator,
        validationLevel: "moderate",
      });
      console.log(`  ✔ ${db.databaseName}.${collection} createCollection`);
    } else {
      throw error;
    }
  }
}

/**
 * @param {import('mongodb').Db} db
 * @param {Array<{ collection: string, schema: object }>} specs
 * @param {string | null} only — single collection name
 */
export async function applyCollectionValidators(db, specs, only = null) {
  for (const { collection, schema } of specs) {
    if (only && collection !== only) continue;
    await applyCollectionValidator(db, collection, schema);
  }
}
