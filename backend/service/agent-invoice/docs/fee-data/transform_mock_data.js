const fs = require('fs');
const path = require('path');

const agentsInput = path.join(__dirname, 'agents.md');
const feesInput = path.join(__dirname, 'agent_fee.md');
const agentsOutput = path.join(__dirname, 'agents_seed.json');
const feesOutput = path.join(__dirname, 'agent_category_fees_seed.json');

function cleanAndParse(fileContent) {
  // Remove block comments /* ... */
  let cleaned = fileContent.replace(/\/\*[\s\S]*?\*\//g, '');
  // Replace ObjectId("...") with "..."
  cleaned = cleaned.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');
  // Trim and remove trailing comma if present
  cleaned = cleaned.trim();
  if (cleaned.endsWith(',')) {
    cleaned = cleaned.slice(0, -1);
  }
  // Wrap into array
  cleaned = `[\n${cleaned}\n]`;
  
  try {
    // Using Function to evaluate instead of strict JSON.parse 
    // to handle any minor JSON irregularities (like trailing commas inside objects)
    const data = (new Function(`return ${cleaned};`))();
    return data;
  } catch (err) {
    console.error("Error parsing data:");
    // Print a snippet where the error might be if possible
    throw err;
  }
}

try {
  console.log("Starting transformation...");
  
  // 1. Transform Agents
  const agentsContent = fs.readFileSync(agentsInput, 'utf8');
  const agentsRaw = cleanAndParse(agentsContent);

  const agentsTransformed = agentsRaw.map(agent => ({
    _id: agent._id,
    agent_code: agent.agentCode,
    agent_name: agent.agentName,
    agent_type: agent.type,
    parent_agent_id: agent.referenceAgent || null,
    currency: agent.currency,
    default_fee_rate: null, 
    status: "active",
    cr_by: "system_seeder",
    cr_date: new Date().toISOString(),
    cr_prog: "mock_data_seeder",
    upd_by: "system_seeder",
    upd_date: new Date().toISOString(),
    upd_prog: "mock_data_seeder"
  }));

  fs.writeFileSync(agentsOutput, JSON.stringify(agentsTransformed, null, 2));
  console.log(`✅ Generated ${agentsOutput} (${agentsTransformed.length} records)`);

  // 2. Transform Agent Fees
  const feesContent = fs.readFileSync(feesInput, 'utf8');
  const feesRaw = cleanAndParse(feesContent);

  const feesTransformed = feesRaw.map(fee => ({
    _id: fee._id,
    agent_id: fee.agentId,
    company_id: fee.gameProvider ? fee.gameProvider.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : null,
    main_cate_id: fee.gameCategory ? fee.gameCategory.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : null,
    platform_name: fee.platformName,
    game_provider: fee.gameProvider,
    game_category: fee.gameCategory,
    fee_rate: parseFloat(fee.feeValue) || 0,
    cr_by: "system_seeder",
    cr_date: new Date().toISOString(),
    cr_prog: "mock_data_seeder",
    upd_by: "system_seeder",
    upd_date: new Date().toISOString(),
    upd_prog: "mock_data_seeder"
  }));

  fs.writeFileSync(feesOutput, JSON.stringify(feesTransformed, null, 2));
  console.log(`✅ Generated ${feesOutput} (${feesTransformed.length} records)`);
  
  console.log("Transformation completed successfully!");
} catch (error) {
  console.error("❌ Transformation failed:", error);
}
