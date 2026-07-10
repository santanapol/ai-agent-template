import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { MemoryRouter } from "@/navigation/compat";

import { AppBrand } from "./AppBrand";

describe("AppBrand", () => {
  it("renders the app name linking home", () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <AppBrand />
        </SidebarProvider>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: APP_CONFIG.name });
    expect(link).toHaveAttribute("href", "/");
  });
});
