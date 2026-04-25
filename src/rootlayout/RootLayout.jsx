import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/RootLayout.css";
import { subscribeToShopSettings } from "../lib/firestoreService";

export default function RootLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [isSiteDown, setIsSiteDown] = useState(false);

  useEffect(() => {
    const unsub = subscribeToShopSettings((settings) => {
      if (settings && settings.isSiteDown !== undefined) {
        setIsSiteDown(settings.isSiteDown);
      }
    });
    return () => unsub();
  }, []);

  if (isSiteDown) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FDFBF7', color: '#3d2b1f', textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>☕</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>We'll be back soon!</h1>
        <p style={{ fontSize: '1.2rem', color: '#6b7280', maxWidth: '500px', lineHeight: '1.6' }}>
          Chiya Jivan is currently under maintenance. We are making some improvements and will be back online shortly. Thank you for your patience!
        </p>
      </div>
    );
  }

  return (
    <div className="root-layout">
      <Navbar />
      <main className={`main-content ${!isHome ? "not-home" : ""}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
