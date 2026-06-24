import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anyPermissionMatches,
  isWildcardEntry,
  matchesPermission,
} from "../permission-match.js";

test("isWildcardEntry", () => {
  assert.equal(isWildcardEntry("profiles:*"), true);
  assert.equal(isWildcardEntry("profiles:list"), false);
});

test("matchesPermission exact and wildcard", () => {
  assert.equal(matchesPermission("invoices:list", "invoices:list"), true);
  assert.equal(matchesPermission("invoices:*", "invoices:read"), true);
  assert.equal(matchesPermission("invoices:list", "invoices:read"), false);
});

test("anyPermissionMatches", () => {
  assert.equal(anyPermissionMatches(["agents:*"], "agents:fees"), true);
  assert.equal(anyPermissionMatches(["agents:list"], "agents:fees"), false);
});
