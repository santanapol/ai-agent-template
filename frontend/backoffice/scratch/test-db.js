import { MongoClient } from "mongodb";

const uri = "mongodb+srv://invoice-read-api:jWDPimjWyzvWlMTZ@777ww-prod.xiu0o.gcp.mongodb.net/zero-platform?appName=agent-invoice";
const dbName = "gpp_777ww";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const items = await db.collection("game_main_category").find({}).limit(10).toArray();
    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
