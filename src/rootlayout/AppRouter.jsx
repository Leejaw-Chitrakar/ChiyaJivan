import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './RootLayout';
import HomePage from '../pages/HomePage';
import MenuPage from '../pages/MenuPage';
import SocialPage from '../pages/SocialPage';

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
]);

export default router;
