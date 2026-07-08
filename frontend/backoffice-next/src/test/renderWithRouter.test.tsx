import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Route, Routes } from "@/navigation/compat";

import { renderWithRouter } from "./renderWithRouter";

function HomePage() {
  return <h1>Router smoke home</h1>;
}

describe("renderWithRouter", () => {
  it("mounts routed content with MemoryRouter", () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>,
      { initialEntries: ["/"] },
    );

    expect(screen.getByRole("heading", { name: /router smoke home/i })).toBeInTheDocument();
  });
});
