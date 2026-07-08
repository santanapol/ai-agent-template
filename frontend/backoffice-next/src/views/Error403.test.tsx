import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { testNavigation } from "../test/mockNavigation";
import { renderWithRouter } from "../test/renderWithRouter";
import Error403 from "./Error403";

describe("Error403", () => {
  beforeEach(() => {
    testNavigation.reset();
  });

  it("shows title and subtitle", () => {
    renderWithRouter(<Error403 />, { initialEntries: ["/403"] });
    expect(screen.getByText("403 Forbidden")).toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it("navigates to dashboard on primary action", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Error403 />, { initialEntries: ["/403"] });
    await user.click(screen.getByRole("button", { name: /go to dashboard/i }));
    expect(testNavigation.push).toHaveBeenCalledWith("/", undefined);
  });
});
