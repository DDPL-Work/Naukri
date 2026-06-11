import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import CandidateLayout from "../layout/CandidateLayout";
import ApplicationsPage from "../pages/ApplicationsPage";
import CandidateDashboard from "../pages/CandidateDashboard";
import SavedJobsPage from "../pages/SavedJobsPage";
import JobsPage from "../pages/JobsPage";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import NotificationsPage from "../pages/NotificationsPage";
import ProfilePage from "../pages/ProfilePage";
import Register from "../pages/Register";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  { path: "/landing/:token", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <CandidateLayout />,
        children: [
          { index: true, element: <Navigate to="/candidate/dashboard" replace /> },
          { path: "/candidate/dashboard", element: <CandidateDashboard /> },
          { path: "/candidate/jobs", element: <JobsPage /> },
          { path: "/candidate/applications", element: <ApplicationsPage /> },
          { path: "/candidate/profile", element: <ProfilePage /> },
          { path: "/candidate/notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
