import buildApp from './app.js';

const start = async () => {
  try {
    const app = await buildApp();
    const port = process.env.PORT || 3000;
    
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on http://localhost:${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
