import { createBrowserRouter } from 'react-router-dom'

import MainLayout from '../layouts/MainLayout'

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
