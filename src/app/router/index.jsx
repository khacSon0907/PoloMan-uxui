import { createBrowserRouter } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import AdminCategories from "../../pages/admin/AdminCategories";
import AdminBanners from "../../pages/admin/AdminBanners";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import AdminPlaceholder from "../../pages/admin/AdminPlaceholder";
import AdminProductCreate from "../../pages/admin/AdminProductCreate";
import AdminProductDetail from "../../pages/admin/AdminProductDetail";
import AdminProducts from "../../pages/admin/AdminProducts";
import AdminUsers from "../../pages/admin/AdminUsers";
import Home from "../../pages/Home";

import Products from "../../pages/Products";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import VerifyOtp from "../../pages/VerifyOtp";
import ForgotPassword from "../../pages/ForgotPassword";
import Account from "../../pages/Account";
import ChangePassword from "../../pages/ChangePassword";
import NotFound from "../../pages/NotFound";
import OAuth2Success from "../../pages/OAuth2Success";

export const router = createBrowserRouter([
  // MAIN WEBSITE
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "products",
        element: <Products />,
      },
      {
        path: "collections",
        element: <Products />,
      },
      {
        path: "account",
        element: <Account />,
      },
      {
        path: "change-password",
        element: <ChangePassword />,
      },
    ],
  },

  // ADMIN WEBSITE
  {
    element: <ProtectedRoute requiredRole="ADMIN" />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: "categories",
            element: <AdminCategories />,
          },
          {
            path: "products",
            element: <AdminProducts />,
          },
          {
            path: "products/create",
            element: <AdminProductCreate />,
          },
          {
            path: "products/:id",
            element: <AdminProductDetail />,
          },
          {
            path: "products/:id/edit",
            element: <AdminPlaceholder title="Cap nhat san pham" />,
          },
          {
            path: "banners",
            element: <AdminBanners />,
          },
          {
            path: "orders",
            element: <AdminPlaceholder title="Quan ly don hang" />,
          },
          {
            path: "users",
            element: <AdminUsers />,
          },
        ],
      },
    ],
  },

  // AUTH PAGES
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/verify-otp",
    element: <VerifyOtp />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/oauth2/success",
    element: <OAuth2Success />,
  },

  // 404
  {
    path: "*",
    element: <NotFound />,
  },
]);
