import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Home from '../../pages/Home'
import Products from '../../pages/Products'
import NotFound from '../../pages/NotFound'

export const router = createBrowserRouter([
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
        element: <Products />, // map collections to Products catalog for now
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
