import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserRole } from "../lib/firestoreService";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./components/AdminLayout";
import Overview from "./pages/Overview";
import MenuManager from "./pages/MenuManager";
import OrderTracking from "./pages/OrderTracking";
import QRManager from "./pages/QRManager";
import SocialManager from "./pages/SocialManager";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Expenses from "./pages/Expenses";
import SuperAdmin from "../superadmin/SuperAdmin";
import KhataDashboard from "./pages/KhataDashboard";

export default function AdminDashboard({ loginOnly = false }) {
  // Initial check: if we have a session, assume authenticated but still check firebase
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasSession = sessionStorage.getItem("isAdminAuth") === "true";

    return hasSession;
  });
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem("userRole") || "loading";
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

        // Fetch/Verify role with a timeout fallback
        const verifyRole = async () => {
          try {
            // Set a timeout to prevent being stuck forever
            const timeoutId = setTimeout(() => {
              setUserRole(prev => (prev === "loading" ? "admin" : prev));
            }, 5000);

            const role = await getUserRole(user);
            clearTimeout(timeoutId);


            setUserRole(role);
            sessionStorage.setItem("userRole", role);
          } catch (err) {

            // Default to admin if verification fails
            setUserRole("admin");
            sessionStorage.setItem("userRole", "admin");
          }
        };
        verifyRole();


      } else {
        // Only clear if we didn't just log in (check session storage)
        // This avoids a flicker or race condition during sign-in redirects
        const hasSession = sessionStorage.getItem("isAdminAuth") === "true";
        if (!hasSession) {

          setIsAuthenticated(false);
          sessionStorage.removeItem("adminUid");
          sessionStorage.removeItem("userRole");
        } else {

          // We don't set isAuthenticated to false yet, we wait for next event
          // or we can set it to false after a timeout if needed.
          // For now, let's just NOT clear it if we have a session.
        }
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (status, role) => {
    setIsAuthenticated(status);
    if (role) setUserRole(role);
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
      <Route path="/" element={<AdminLayout onLogout={handleLogout} userRole={userRole} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Overview />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="orders" element={<OrderTracking />} />
        <Route path="qrcodes" element={<QRManager />} />
        <Route path="social" element={<SocialManager />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings userRole={userRole} />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="khata" element={<KhataDashboard userRole={userRole} />} />
        <Route path="super" element={userRole === 'superadmin' ? <SuperAdmin /> : <Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
