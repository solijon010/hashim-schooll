import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { DashboardLoading, PageNotFound } from "../components";
import Group from "../pages/Group";
import SignUp from "../pages/SignUp";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";
const AttendanceHistory = lazy(() => import("../pages/AttendanceHistory"));
const MarkAttendance = lazy(() => import("../pages/MarkAttendance"));
const DailyAttendance = lazy(() => import("../pages/DailyAttendance"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Payments = lazy(() => import("../pages/Payments"));
function Router() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<DashboardLoading />}>
              <Dashboard />
            </Suspense>
          ),
        },
        {
          path: "/dailyAttendance",
          element: <DailyAttendance />,
        },
        {
          path: "/attendanceHistory",
          element: <AttendanceHistory />,
        },
        {
          path: "/markAttendance",
          element: <MarkAttendance />,
        },
        {
          path: "/group/:id",
          element: <Group />,
        },
        {
          path: "/payments",
          element: <Payments />,
        },
      ],
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/sign-up",
      element: <SignUp />,
    },
    {
      path: "*",
      element: <PageNotFound />,
    },
  ]);
  return (
    <Suspense fallback={<DashboardLoading />}>
      <RouterProvider router={route} />
    </Suspense>
  );
}

export default Router;
