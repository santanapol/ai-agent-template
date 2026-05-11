import {
  canManageBillingPlan,
  canManageMembers,
  isOuLevelRole,
} from "./permissions";

describe("RBAC permission helpers", () => {
  it("resolves member management roles correctly", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("manager")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
    expect(canManageMembers("billing")).toBe(false);
  });

  it("resolves billing manage roles correctly", () => {
    expect(canManageBillingPlan("owner")).toBe(true);
    expect(canManageBillingPlan("admin")).toBe(true);
    expect(canManageBillingPlan("manager")).toBe(false);
    expect(canManageBillingPlan("billing")).toBe(false);
  });

  it("resolves OU-level roles correctly", () => {
    expect(isOuLevelRole("owner")).toBe(true);
    expect(isOuLevelRole("admin")).toBe(true);
    expect(isOuLevelRole("manager")).toBe(false);
  });
});
