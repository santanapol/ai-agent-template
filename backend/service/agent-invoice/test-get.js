import buildApp from './src/app.js';

async function run() {
  const app = await buildApp();
  
  // mock the db plugin specifically for this test if we don't have mongodb running,
  // but wait, db.plugin connects to mongodb://localhost:27017/zero_platform.
  // Assuming MongoDB is running locally.

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/agents/665a3d76b1e5f8b9e6f2b1a1/fees'
    });
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', JSON.stringify(res.json(), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}

run();
