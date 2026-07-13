import { createRef } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MatrixCell, type MatrixCellRef } from "./MatrixCell";

describe("MatrixCell", () => {
  it("uses provider and category in aria labels", () => {
    render(<MatrixCell defaultRate={5} readOnly={false} providerLabel="3OAKS" categoryLabel="Slot" />);

    expect(screen.getByLabelText("Override fee for 3OAKS, Slot")).toBeInTheDocument();
    expect(screen.getByLabelText("Override fee for 3OAKS, Slot override toggle")).toBeInTheDocument();
  });

  it("notifies onChange when toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MatrixCell defaultRate={5} readOnly={false} onChange={onChange} />);

    await user.click(screen.getByLabelText("Override agent fee override toggle"));
    expect(onChange).toHaveBeenCalled();
  });

  it("syncs disabled cell value when defaultRate changes", () => {
    const ref = createRef<MatrixCellRef>();
    const { rerender } = render(<MatrixCell ref={ref} defaultRate={5} readOnly={false} />);

    expect(ref.current?.getValues().af).toBe(5);

    rerender(<MatrixCell ref={ref} defaultRate={10} readOnly={false} />);
    expect(ref.current?.getValues().af).toBe(10);
  });
});
