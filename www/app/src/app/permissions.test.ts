import { canManageMembers, isOuLevelRole } from "./permissions";

describe("RBAC permission helpers", () => {
  it("resolves member management roles correctly", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("manager")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
    expect(canManageMembers("billing")).toBe(false);
  });

  it("resolves OU-level roles correctly", () => {
    expect(isOuLevelRole("owner")).toBe(true);
    expect(isOuLevelRole("admin")).toBe(true);
    expect(isOuLevelRole("manager")).toBe(false);
  });
});
