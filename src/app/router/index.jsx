import { createBrowserRouter } from 'react-router-dom'

import AdminLayout from '../layouts/AdminLayout'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'

import AdminDashboard from '../../pages/admin/AdminDashboard'
import AdminPlaceholder from '../../pages/admin/AdminPlaceholder'
import Home from '../../pages/Home'
import Products from '../../pages/Products'
import Login from '../../pages/Login'
import Register from '../../pages/Register'
import VerifyOtp from '../../pages/VerifyOtp'
import ForgotPassword from '../../pages/ForgotPassword'
import Account from '../../pages/Account'
import ChangePassword from '../../pages/ChangePassword'
import NotFound from '../../pages/NotFound'

export const router = createBrowserRouter([
  // MAIN WEBSITE
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'products',
        element: <Products />,
      },
      {
        path: 'collections',
        element: <Products />,
      },
      {
        path: 'account',
        element: <Account />,
      },
      {
        path: 'change-password',
        element: <ChangePassword />,
      },
    ],
  },

  // ADMIN WEBSITE
  {
    element: <ProtectedRoute requiredRole="ADMIN" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: 'products',
            element: <AdminPlaceholder title="Quan ly san pham" />,
          },
          {
            path: 'orders',
            element: <AdminPlaceholder title="Quan ly don hang" />,
          },
          {
            path: 'users',
            element: <AdminPlaceholder title="Quan ly khach hang" />,
          },
        ],
      },
    ],
  },

  // AUTH PAGES
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/verify-otp',
    element: <VerifyOtp />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },

  // 404
  {
    path: '*',
    element: <NotFound />,
  },
])
