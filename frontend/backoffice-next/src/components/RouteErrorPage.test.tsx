import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/renderWithProviders";
import RouteErrorPage from "./RouteErrorPage";

describe("RouteErrorPage", () => {
  it("renders the legacy Error500 fallback", () => {
    renderWithProviders(<RouteErrorPage />);
    expect(screen.getByText("500 Server Error")).toBeInTheDocument();
  });
});
