import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListPageCard } from "./ListPageCard";

describe("ListPageCard", () => {
  it("renders title, description, toolbar, filterRow, and children", () => {
    render(
      <ListPageCard
        title="Staff Management"
        description="Manage staff profiles."
        toolbar={<button type="button">Create</button>}
        filterRow={<span>Status filter</span>}
        headerAddon={<p>Branch alert</p>}
      >
        <div>Table content</div>
      </ListPageCard>,
    );

    expect(screen.getByText("Staff Management")).toBeInTheDocument();
    expect(screen.getByText("Manage staff profiles.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByText("Status filter")).toBeInTheDocument();
    expect(screen.getByText("Branch alert")).toBeInTheDocument();
    expect(screen.getByText("Table content")).toBeInTheDocument();
  });
});
