import { Navigate, createBrowserRouter } from "react-router-dom";
import { ScopeGuard, RoleGuard } from "./guards";
import { AppLayout } from "../layout/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ItemsPage } from "../pages/ItemsPage";
import { MembersPage } from "../pages/MembersPage";
import { BillingPage } from "../pages/BillingPage";
import { ReportsPage } from "../pages/ReportsPage";
import { OUSettingsPage } from "../pages/OUSettingsPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { NotFoundPage } from "../pages/NotFoundPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ScopeGuard />,
    children: [
      {
        path: "/ou/:ouId/branches/:branchId",
        element: <AppLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "items",
            element: <ItemsPage />,
          },
          {
            path: "members",
            element: <MembersPage />,
          },
          {
            path: "billing",
            element: <BillingPage />,
          },
          {
            path: "reports",
            element: <ReportsPage />,
          },
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
        ],
      },
    ],
  },
  {
    element: <RoleGuard allow={["owner", "admin"]} />,
    children: [
      {
        path: "/ou/:ouId/settings",
        element: <OUSettingsPage />,
      },
    ],
  },
  {
    path: "/forbidden",
    element: <ForbiddenPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
