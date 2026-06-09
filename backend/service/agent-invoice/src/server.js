import buildApp from "./app.js";

const start = async () => {
  const app = await buildApp();
  try {
    const port = process.env.PORT || 3102;
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err, "Error starting server");
    process.exit(1);
  }
};

start();
