import { Navigate, createBrowserRouter } from "react-router-dom";
import { ScopeGuard, RoleGuard } from "./guards";
import { AppLayout } from "../layout/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { MembersPage } from "../pages/MembersPage";
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
            path: "members",
            element: <MembersPage />,
          },
          {
            index: true,
            element: <Navigate to="members" replace />,
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
