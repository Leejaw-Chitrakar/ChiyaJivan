import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  QrCode,
  Share2,
  Settings,
  LogOut,
  Bell,
  Menu as MenuIcon,
  ChevronRight,
  Coffee,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { getShopSettings, saveShopSettings } from "../../lib/firestoreService";

export default function AdminLayout({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [adminName, setAdminName] = useState("Admin User");
  const [adminLetter, setAdminLetter] = useState("A");
  const [shopSettings, setShopSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load shop status from Firestore
    async function loadStatus() {
      const settings = await getShopSettings();
      if (settings) {
        if (typeof settings.isShopOpen === "boolean") {
          setIsShopOpen(settings.isShopOpen);
        }
        setShopSettings(settings);
      }
    }
    loadStatus();

    // Set admin face
    if (auth.currentUser) {
      const email = auth.currentUser.email || "Admin User";
      const name = email.split("@")[0];
      setAdminName(name);
      setAdminLetter(name.charAt(0).toUpperCase());
    }
  }, []);

  // Pseudo-cron for Auto Schedule
  useEffect(() => {
    if (!shopSettings || !shopSettings.autoScheduleEnabled) return;

    const checkSchedule = async () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTotal = currentHours * 60 + currentMins;

      // Parse times like "07:00"
      const [openH, openM] = (shopSettings.openTime || "07:00")
        .split(":")
        .map(Number);
      const [closeH, closeM] = (shopSettings.closeTime || "21:00")
        .split(":")
        .map(Number);

      const openTotal = openH * 60 + openM;
      const closeTotal = closeH * 60 + closeM;

      const shouldBeOpen =
        currentTotal >= openTotal && currentTotal < closeTotal;

      // Prevent redundant saves
      if (shouldBeOpen !== isShopOpen) {
        setIsShopOpen(shouldBeOpen);
        await saveShopSettings({ isShopOpen: shouldBeOpen });
      }
    };

    // Check immediately, then every 1 minute
    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);

    return () => clearInterval(interval);
  }, [shopSettings, isShopOpen]);

  const handleToggleShopStatus = async () => {
    const newState = !isShopOpen;
    setIsShopOpen(newState);
    await saveShopSettings({ isShopOpen: newState });
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      desc: "Overview & Analytics",
    },
    {
      name: "Menu",
      path: "/admin/menu",
      icon: UtensilsCrossed,
      desc: "Manage your items",
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: ClipboardList,
      desc: "Track live orders",
    },
    {
      name: "Table QR Codes",
      path: "/admin/tables",
      icon: QrCode,
      desc: "Generate & print QRs",
    },
    {
      name: "Social & Updates",
      path: "/admin/social",
      icon: Share2,
      desc: "Content & hours",
    },
    // { name: 'Settings', path: '/admin/settings', icon: Settings, desc: 'Account preferences' },
  ];

  const handleLogout = async () => {
    await onLogout();
    navigate("/admin");
  };

  return (
    <div
      className="flex overflow-hidden"
      style={{
        height: "100vh",
        minHeight: "-webkit-fill-available",
        background: "#FDFBF7",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col lg:static lg:translate-x-0 flex-shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: "288px", background: "#1f130b" }}
      >
        {/* Brand */}
        <div
          style={{ padding: "24px 24px 16px" }}
          className="flex items-center gap-4"
        >
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "#AD4928",
              boxShadow: "0 8px 28px rgba(173,73,40,0.45)",
            }}
          >
            <Coffee size={22} className="text-white" />
          </div>
          <div>
            <h1
              className="text-white font-bold"
              style={{ fontSize: "18px", letterSpacing: "-0.02em" }}
            >
              Chiya Jivan
            </h1>
            <p
              className="font-bold uppercase"
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.28)",
                letterSpacing: "0.2em",
                marginTop: 2,
              }}
            >
              Admin Console
            </p>
          </div>
        </div>

        {/* Shop Status */}
        <div
          style={{
            margin: "0 16px 16px",
            padding: "16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: isShopOpen ? "#34d399" : "#f87171",
                  boxShadow: isShopOpen
                    ? "0 0 12px rgba(52,211,153,0.7)"
                    : "none",
                }}
              />
              <div>
                <p
                  className="font-bold uppercase"
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.28)",
                    letterSpacing: "0.15em",
                  }}
                >
                  Shop Status
                </p>
                <p
                  className="font-bold"
                  style={{
                    fontSize: "14px",
                    color: isShopOpen ? "#34d399" : "#f87171",
                    marginTop: 2,
                  }}
                >
                  {isShopOpen ? "Open for Business" : "Currently Closed"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleShopStatus}
              className="flex-shrink-0 relative transition-colors duration-300"
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: isShopOpen ? "#10b981" : "rgba(255,255,255,0.1)",
              }}
            >
              <div
                className="absolute bg-white shadow-lg transition-all duration-300"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  top: 3,
                  transform: isShopOpen
                    ? "translateX(27px)"
                    : "translateX(3px)",
                }}
              />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{ padding: "0 12px" }}
        >
          <p
            className="font-bold uppercase"
            style={{
              fontSize: "9px",
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.25em",
              padding: "0 12px",
              marginBottom: 12,
            }}
          >
            Navigation
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className="group flex items-center gap-3 transition-all duration-200"
                style={({ isActive }) => ({
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: isActive ? "#AD4928" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.38)",
                  boxShadow: isActive
                    ? "0 8px 24px rgba(173,73,40,0.35)"
                    : "none",
                })}
              >
                {({ isActive }) => (
                  <>
                    <div
                      className="flex-shrink-0 transition-colors"
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background: isActive
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <item.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-bold"
                        style={{ fontSize: "13px", lineHeight: 1.3 }}
                      >
                        {item.name}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          lineHeight: 1.3,
                          marginTop: 2,
                          color: isActive
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                    {isActive && (
                      <ChevronRight
                        size={16}
                        style={{ flexShrink: 0, opacity: 0.5 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sign Out */}
        <div
          style={{
            padding: "12px 16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            marginTop: 12,
          }}
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full group transition-all"
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              color: "rgba(255,255,255,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.3)";
            }}
          >
            <div
              style={{
                padding: 8,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <LogOut size={18} />
            </div>
            <span className="font-bold" style={{ fontSize: "13px" }}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main
        className="flex-1 flex flex-col"
        style={{ minWidth: 0, overflowX: "hidden" }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between flex-shrink-0 sticky top-0 z-30"
          style={{
            padding: "16px 24px",
            background: "rgba(253,251,247,0.8)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <button
            className="lg:hidden transition-colors"
            style={{ padding: 10, borderRadius: 12, color: "#6b7280" }}
            onClick={() => setIsSidebarOpen(true)}
          >
            <MenuIcon size={22} />
          </button>

          <div
            className="flex items-center"
            style={{ gap: 20, marginLeft: "auto" }}
          >
            {/* Live status pill */}
            <div
              className="flex items-center font-bold"
              style={{
                gap: 10,
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: "12px",
                background: isShopOpen ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${isShopOpen ? "#d1fae5" : "#fecdd3"}`,
                color: isShopOpen ? "#059669" : "#ef4444",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isShopOpen ? "#10b981" : "#f87171",
                  animation: isShopOpen ? "pulse 2s infinite" : "none",
                }}
              />
              {isShopOpen ? "Shop is Live" : "Shop Closed"}
            </div>

            <div style={{ width: 1, height: 28, background: "#f3f4f6" }} />

            <button
              className="relative transition-colors"
              style={{ padding: 10, borderRadius: 12, color: "#9ca3af" }}
            >
              <Bell size={20} />
              <span
                className="absolute"
                style={{
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#AD4928",
                  border: "2px solid white",
                }}
              />
            </button>

            <div
              className="flex items-center"
              style={{ gap: 14, paddingLeft: 4 }}
            >
              <div className="text-right hidden sm:block">
                <p
                  className="font-bold"
                  style={{
                    fontSize: "14px",
                    color: "#3d2b1f",
                    lineHeight: 1.3,
                  }}
                >
                  {adminName}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    lineHeight: 1.3,
                    marginTop: 2,
                  }}
                >
                  Super Admin
                </p>
              </div>
              <div
                className="flex items-center justify-center text-white font-bold uppercase"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  fontSize: "16px",
                  background: "linear-gradient(135deg, #AD4928, #7a3319)",
                  boxShadow: "0 4px 16px rgba(173,73,40,0.25)",
                }}
              >
                {adminLetter}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div
          className="flex-1"
          style={{ overflowY: "auto", overflowX: "hidden" }}
        >
          <div style={{ padding: "32px 32px 48px", maxWidth: "100%" }}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Styles for animations and scrollbars */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
}
