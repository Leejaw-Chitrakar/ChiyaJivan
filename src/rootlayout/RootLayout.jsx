import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/RootLayout.css';

export default function RootLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="root-layout">
      <Navbar />
      <main className={`main-content ${!isHome ? 'not-home' : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
