import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AdminLayout } from './layout/admin-layout';

import { RequireAdmin } from '@entities/session';
import { CategoriesPage } from '@pages/categories';
import { DashboardPage } from '@pages/dashboard';
import { LoginPage } from '@pages/login';
import { NotFoundPage } from '@pages/not-found';
import { OrderDetailPage, OrdersListPage } from '@pages/orders';
import { ProductCreatePage, ProductEditPage, ProductsListPage } from '@pages/products';
import { ReviewsPage } from '@pages/reviews';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'products', element: <ProductsListPage /> },
      { path: 'products/new', element: <ProductCreatePage /> },
      { path: 'products/:id', element: <ProductEditPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'orders', element: <OrdersListPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
