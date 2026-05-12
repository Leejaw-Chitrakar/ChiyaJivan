import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './RootLayout';
import HomePage from '../pages/HomePage';
import MenuPage from '../pages/MenuPage';
import SocialPage from '../pages/SocialPage';
import OrderPage from '../pages/OrderPage';
import AdminDashboard from '../admin/AdminDashboard';
import WaiterDashboard from '../waiter/WaiterDashboard';
import AdminLogin from '../admin/AdminLogin';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'menu',
        element: <MenuPage />,
      },
      {
        path: 'social',
        element: <SocialPage />,
      },
    ],
  },
  {
    path: '/order',
    element: <OrderPage />,
  },
  {
    path: '/waiter',
    element: <WaiterDashboard />,
  },
  {
    path: '/admin',
    element: <AdminDashboard loginOnly />,
  },
  {
    path: '/admin/*',
    element: <AdminDashboard />,
  },
]);

export default router;
