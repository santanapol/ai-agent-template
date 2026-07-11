import { describe, expect, it } from "vitest";

import {
  getEditorGateBadgeLabel,
  getEditorPageDescription,
  getEditorSaveLabel,
} from "./editorCopy";

describe("editorCopy", () => {
  describe("getEditorSaveLabel", () => {
    it("returns create label on create mode", () => {
      expect(getEditorSaveLabel("create")).toBe("Create report");
    });

    it("returns save label on edit mode", () => {
      expect(getEditorSaveLabel("edit")).toBe("Save changes");
    });
  });

  describe("getEditorGateBadgeLabel", () => {
    it("returns Draft while script gate is required and incomplete", () => {
      expect(getEditorGateBadgeLabel("pending", true)).toBe("Draft");
      expect(getEditorGateBadgeLabel("validated", true)).toBe("Draft");
    });

    it("returns Ready to save when gate is complete or not required", () => {
      expect(getEditorGateBadgeLabel("tested", true)).toBe("Ready to save");
      expect(getEditorGateBadgeLabel("validated", false)).toBe("Ready to save");
    });
  });

  describe("getEditorPageDescription", () => {
    it("prefers report description when set", () => {
      expect(getEditorPageDescription("create", "pending", "Custom summary", true)).toBe("Custom summary");
    });

    it("returns create gate-specific fallbacks", () => {
      expect(getEditorPageDescription("create", "pending", "", true)).toBe(
        "Name your report, edit the query, then validate.",
      );
      expect(getEditorPageDescription("create", "validated", "", true)).toBe(
        "Script compiles — run a test before saving.",
      );
      expect(getEditorPageDescription("create", "tested", "", true)).toBe(
        "Test passed — save to create this report.",
      );
    });

    it("returns edit fallbacks aligned with create gate flow", () => {
      expect(getEditorPageDescription("edit", "pending", "", false)).toBe(
        "Script unchanged — save metadata anytime.",
      );
      expect(getEditorPageDescription("edit", "pending", "", true)).toBe("Edit the query, then validate.");
      expect(getEditorPageDescription("edit", "validated", "", true)).toBe(
        "Script compiles — run a test before saving.",
      );
      expect(getEditorPageDescription("edit", "tested", "", true)).toBe("Test passed — save changes.");
    });
  });
});
