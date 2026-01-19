import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { DashboardLoading, PageNotFound } from "../components";
import Group from "../pages/Group";
const AttendanceHistory = lazy(() => import("../pages/AttendanceHistory"));
const AttendanceStatistics = lazy(() =>
  import("../pages/AttendanceStatistics")
);
const DailyAttendance = lazy(() => import("../pages/DailyAttendance"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
function Router() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <MainLayout />,
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
          path: "/attendanceStatistics",
          element: <AttendanceStatistics />,
        },
        {
          path: "/group/:id",
          element: <Group />,
        },
      ],
    },
    {
      path: "*",
      element: <PageNotFound />,
    },
  ]);
  return <RouterProvider router={route} />;
}

export default Router;
