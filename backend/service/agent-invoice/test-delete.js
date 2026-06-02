import buildApp from './src/app.js';

async function run() {
  const app = await buildApp();
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  
  try {
    // 1. Create a fee to delete
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_SOFT_DELETE',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 10
      }
    });
    const feeId = createRes.json().data.insertedId;
    console.log('Created Fee ID:', feeId);

    // 2. Delete the fee
    let deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agents/${agentId}/fees/${feeId}`
    });
    console.log('DELETE 1 (Success) STATUS:', deleteRes.statusCode);

    // 3. Delete again (should fail)
    deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agents/${agentId}/fees/${feeId}`
    });
    console.log('DELETE 2 (Not Found) STATUS:', deleteRes.statusCode);
    
  } catch (err) {
    console.error(err);
  } finally {
    // Clean up created document in case delete failed
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_SOFT_DELETE' });
    await app.close();
  }
}

run();
