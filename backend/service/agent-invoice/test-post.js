import buildApp from './src/app.js';

async function run() {
  const app = await buildApp();
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  
  try {
    // 1. First POST
    let res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_SOFT',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 15.5
      }
    });
    console.log('POST 1 STATUS:', res.statusCode);
    console.log('BODY:', JSON.stringify(res.json(), null, 2));

    // 2. Duplicate POST
    res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_SOFT',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 10
      }
    });
    console.log('POST 2 (Duplicate) STATUS:', res.statusCode);
    console.log('BODY:', JSON.stringify(res.json(), null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    // Clean up created document
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_SOFT' });
    await app.close();
  }
}

run();
