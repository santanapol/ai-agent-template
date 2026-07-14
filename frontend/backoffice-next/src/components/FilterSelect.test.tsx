import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterSelect } from "./FilterSelect";

function ControlledFilterSelect(props: {
  options: { value: string; label: string }[];
  loading?: boolean;
  onSearchQueryChange?: (query: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>();
  return (
    <FilterSelect
      id="test-select"
      placeholder="Select item"
      value={value}
      onChange={setValue}
      options={props.options}
      includeAllOption={false}
      searchable
      serverSearch
      loading={props.loading}
      onSearchQueryChange={props.onSearchQueryChange}
    />
  );
}

describe("FilterSelect", () => {
  it("keeps selection visible after closing when options shrink from server search reset", async () => {
    const user = userEvent.setup();
    const onSearchQueryChange = vi.fn();

    const { rerender } = render(
      <ControlledFilterSelect
        options={[
          { value: "link-a", label: "3000001 — BERLIN" },
          { value: "link-b", label: "3000002 — ZULU" },
        ]}
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "3000001 — BERLIN" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("3000001 — BERLIN");
    });

    rerender(
      <ControlledFilterSelect
        options={[{ value: "link-b", label: "3000002 — ZULU" }]}
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("3000001 — BERLIN");
    expect(onSearchQueryChange).not.toHaveBeenCalled();
  });

  it("does not reset server search when closing without typing", async () => {
    const user = userEvent.setup();
    const onSearchQueryChange = vi.fn();

    render(
      <ControlledFilterSelect
        options={[{ value: "link-a", label: "3000001 — BERLIN" }]}
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "3000001 — BERLIN" }));

    expect(onSearchQueryChange).not.toHaveBeenCalled();
  });
});
