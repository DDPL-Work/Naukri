import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import AdminDashboard from "../pages/AdminDashboard";
import AdminSection from "../pages/AdminSection";
import BlogEditorPage from "../pages/BlogEditorPage";
import BlogsPage from "../pages/BlogsPage";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import RolesPage from "../pages/RolesPage";
import ProtectedRoute from "./ProtectedRoute";
import UsersPage from "../pages/UsersPage";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "/admin/dashboard", element: <AdminDashboard /> },
          { path: "/admin/users", element: <UsersPage /> },
          { path: "/admin/roles", element: <RolesPage /> },
          { path: "/admin/companies", element: <AdminSection /> },
          { path: "/admin/jobs", element: <AdminSection /> },
          { path: "/admin/candidates", element: <AdminSection /> },
          { path: "/admin/applications", element: <AdminSection /> },
          { path: "/admin/blogs", element: <BlogsPage /> },
          { path: "/admin/blogs/new", element: <BlogEditorPage /> },
          { path: "/admin/blogs/:id/edit", element: <BlogEditorPage /> },
          { path: "/admin/monitoring", element: <AdminSection /> },
          { path: "/admin/reports", element: <AdminSection /> },
          { path: "/admin/settings", element: <AdminSection /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
