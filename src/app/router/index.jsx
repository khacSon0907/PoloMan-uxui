import { createBrowserRouter } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import AdminCategories from "../../pages/admin/AdminCategories";
import AdminBanners from "../../pages/admin/AdminBanners";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import AdminOrders from "../../pages/admin/AdminOrders";
import AdminPromotionBanners from "../../pages/admin/AdminPromotionBanners";
import AdminProductCreate from "../../pages/admin/AdminProductCreate";
import AdminProductDetail from "../../pages/admin/AdminProductDetail";
import AdminProducts from "../../pages/admin/AdminProducts";
import AdminRoles from "../../pages/admin/AdminRoles";
import AdminUsers from "../../pages/admin/AdminUsers";
import Home from "../../pages/Home";

import Cart from "../../pages/Cart";
import CheckoutPayment from "../../pages/CheckoutPayment";
import Favorites from "../../pages/Favorites";
import ProductDetail from "../../pages/ProductDetail";
import Products from "../../pages/Products";
import SizeGuide from "../../pages/SizeGuide";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import VerifyOtp from "../../pages/VerifyOtp";
import ForgotPassword from "../../pages/ForgotPassword";
import Account from "../../pages/Account";
import AccountAddress from "../../pages/AccountAddress";
import AccountOrderDetail from "../../pages/AccountOrderDetail";
import AccountOrders from "../../pages/AccountOrders";
import About from "../../pages/About";
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
        path: "products/:id",
        element: <ProductDetail />,
      },
      {
        path: "collections",
        element: <Products />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "checkout/payment",
        element: <CheckoutPayment />,
      },
      {
        path: "favorites",
        element: <Favorites />,
      },
      {
        path: "account",
        element: <Account />,
      },
      {
        path: "account/orders",
        element: <AccountOrders />,
      },
      {
        path: "account/orders/:orderId",
        element: <AccountOrderDetail />,
      },
      {
        path: "account/addresses/:addressId",
        element: <AccountAddress />,
      },
      {
        path: "account/addresses/:addressId/:mode",
        element: <AccountAddress />,
      },
      {
        path: "change-password",
        element: <ChangePassword />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "size-guide",
        element: <SizeGuide />,
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
            element: <AdminProductCreate />,
          },
          {
            path: "banners",
            element: <AdminBanners />,
          },
          {
            path: "promotion-banners",
            element: <AdminPromotionBanners />,
          },
          {
            path: "orders",
            element: <AdminOrders />,
          },
          {
            path: "users",
            element: <AdminUsers />,
          },
          {
            path: "roles",
            element: <AdminRoles />,
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
