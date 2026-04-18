import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./components/AdminLayout";
import Overview from "./pages/Overview";
import MenuManager from "./pages/MenuManager";
import OrderTracking from "./pages/OrderTracking";
import TableQRManager from "./pages/TableQRManager";
import SocialManager from "./pages/SocialManager";
import Settings from "./pages/Settings";

export default function AdminDashboard({ loginOnly = false }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("isAdminAuth") === "true";
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Add admin-page class to body so public site styles don't bleed in
  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => document.body.classList.remove("admin-page");
  }, []);

  // Listen to genuine firebase auth state to prevent querying firestore without a token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        sessionStorage.setItem("isAdminAuth", "true");
        sessionStorage.setItem("adminUid", user.uid);
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem("isAdminAuth");
        sessionStorage.removeItem("adminUid");
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (status) => {
    setIsAuthenticated(status);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
  };

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-vh-100" style={{ background: '#FDFBF7', height: '100vh' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#AD4928] border-t-transparent"></div>
      </div>
    );
  }

  // The /admin route: always show login page, but redirect to dashboard if already authenticated
  if (loginOnly) {
    if (isAuthenticated) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <AdminLogin onLogin={handleLogin} />;
  }

  // The /admin/* routes: show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout onLogout={handleLogout} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Overview />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="orders" element={<OrderTracking />} />
        <Route path="tables" element={<TableQRManager />} />
        <Route path="social" element={<SocialManager />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
