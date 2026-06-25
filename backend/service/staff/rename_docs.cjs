const fs = require("fs");
const path = require("path");

const filesToUpdate = [
  "RUNBOOK.md",
  "docs/database-erd.md",
  "docs/technical-architecture.md",
  "docs/business-domain.md",
  "README.md",
  "openapi.yaml",
  "package.json",
  "_mission-control/SPEC.md",
];

let changedCount = 0;

for (const relPath of filesToUpdate) {
  const filePath = path.join(__dirname, relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    if (content.includes("auth_staff_profiles")) {
      content = content.replace(/auth_staff_profiles/g, "staff_profiles");
      fs.writeFileSync(filePath, content, "utf8");
      console.log("Updated:", relPath);
      changedCount++;
    }
  } else {
    console.warn("File not found:", relPath);
  }
}
console.log("Total files updated:", changedCount);
