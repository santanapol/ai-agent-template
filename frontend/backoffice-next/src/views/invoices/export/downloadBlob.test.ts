import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { triggerBlobDownload } from "./downloadBlob";

describe("triggerBlobDownload", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;
  let removeChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    click = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "a") {
        return document.createElement(tag);
      }
      return {
        href: "",
        download: "",
        click,
      } as unknown as HTMLAnchorElement;
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(appendChild);
    vi.spyOn(document.body, "removeChild").mockImplementation(removeChild);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates object URL, triggers download, and revokes URL", () => {
    const blob = new Blob(["test"], { type: "application/pdf" });

    triggerBlobDownload(blob, "invoice_IV-001.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
