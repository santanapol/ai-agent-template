import buildApp from './src/app.js';

async function run() {
  const app = await buildApp();
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  
  try {
    // 1. Create a fee to update
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_SOFT_PATCH',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 10
      }
    });
    const feeId = createRes.json().data.insertedId;
    console.log('Created Fee ID:', feeId);

    // Get the fee to find upd_date
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/agents/${agentId}/fees`
    });
    const fee = getRes.json().data.find(f => f._id === feeId);
    console.log('Original Fee Rate:', fee.fee_rate, 'upd_date:', fee.upd_date);

    // 2. Patch with correct upd_date
    let patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${feeId}`,
      payload: {
        fee_rate: 15,
        upd_date: fee.upd_date
      }
    });
    console.log('PATCH 1 (Success) STATUS:', patchRes.statusCode);

    // 3. Patch with old upd_date (should fail)
    patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${feeId}`,
      payload: {
        fee_rate: 20,
        upd_date: fee.upd_date // old date
      }
    });
    console.log('PATCH 2 (Conflict) STATUS:', patchRes.statusCode);
    
  } catch (err) {
    console.error(err);
  } finally {
    // Clean up created document
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_SOFT_PATCH' });
    await app.close();
  }
}

run();
