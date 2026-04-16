import { createBrowserRouter } from "react-router-dom";

import { AdminRoute, ProtectedRoute } from "../components/auth/RouteGuards";
import { MainLayout } from "../components/layout/MainLayout";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminOrdersPage } from "../pages/AdminOrdersPage";
import { AdminProductsPage } from "../pages/AdminProductsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { CartPage } from "../pages/CartPage";
import { DashboardPage } from "../pages/DashboardPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { MonitoringPage } from "../pages/MonitoringPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OrderDetailsPage } from "../pages/OrderDetailsPage";
import { ProductDetailsPage } from "../pages/ProductDetailsPage";
import { ProductsPage } from "../pages/ProductsPage";
import { RegisterPage } from "../pages/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "products",
        element: <ProductsPage />,
      },
      {
        path: "products/:productId",
        element: <ProductDetailsPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "monitoring",
        element: <MonitoringPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "orders/:orderId",
            element: <OrderDetailsPage />,
          },
          {
            path: "cart",
            element: <CartPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: "admin",
                element: <AdminDashboardPage />,
              },
              {
                path: "admin/products",
                element: <AdminProductsPage />,
              },
              {
                path: "admin/orders",
                element: <AdminOrdersPage />,
              },
              {
                path: "admin/users",
                element: <AdminUsersPage />,
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
