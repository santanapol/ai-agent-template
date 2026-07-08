import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { testNavigation } from "../test/mockNavigation";
import { renderWithRouter } from "../test/renderWithRouter";
import Error500 from "./Error500";

describe("Error500", () => {
  beforeEach(() => {
    testNavigation.reset();
  });

  it("shows title and subtitle", () => {
    renderWithRouter(<Error500 />, { initialEntries: ["/500"] });
    expect(screen.getByText("500 Server Error")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("navigates to dashboard on primary action", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Error500 />, { initialEntries: ["/500"] });
    await user.click(screen.getByRole("button", { name: /go to dashboard/i }));
    expect(testNavigation.push).toHaveBeenCalledWith("/", undefined);
  });
});
