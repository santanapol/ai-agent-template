// สร้าง Indexes สำหรับ Collection `agents`
print("Creating indexes for agents collection...");
db.agents.createIndex({ ou_id: 1, branch_id: 1 }, { unique: true });
db.agents.createIndex({ ou_id: 1 });
db.agents.createIndex({ parent_branch_id: 1 });

// สร้าง Indexes สำหรับ Collection `agent_fees`
print("Creating indexes for agent_fees collection...");
db.agent_fees.createIndex(
    {
        ou_id: 1,
        branch_id: 1,
        game_company_id: 1,
        game_main_cate_id: 1
    },
    {
        name: "ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1",
        unique: true,
        background: true
    }
);

print("All indexes created successfully.");
