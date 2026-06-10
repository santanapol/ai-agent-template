import buildApp from "./app.js";
import { connectDatabase } from "./config/database.js";
import { connectReadDatabase } from "./config/database-read.js";
import { ensureReportIndexes } from "./modules/reports/reports.repository.js";
import { ensureDownloadHistoryIndexes } from "./modules/reports/download-history.repository.js";

const start = async () => {
  const app = await buildApp();
  try {
    const db = await connectDatabase();
    app.log.info({ dbName: db.databaseName }, "primary mongodb connected");
    await ensureReportIndexes(db);
    await ensureDownloadHistoryIndexes(db);

    await connectReadDatabase();
    app.log.info("read-only mongodb connected");

    const port = process.env.PORT || 3103;
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err, "Error starting server");
    process.exit(1);
  }
};

start();
