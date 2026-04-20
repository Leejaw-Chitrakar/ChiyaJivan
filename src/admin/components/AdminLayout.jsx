import { useState, useEffect, useRef } from "react";
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
  Clock,
  History,
  X,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { subscribeToShopSettings, saveShopSettings, subscribeToOrders } from "../../lib/firestoreService";
import "../styles/GlobalAdmin.css";

function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours > 1 ? 's' : ''} ago`;
}

export default function AdminLayout({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [adminName, setAdminName] = useState("Admin User");
  const [adminLetter, setAdminLetter] = useState("A");
  const [shopSettings, setShopSettings] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [newOrderFlash, setNewOrderFlash] = useState(null);
  const [tableNames, setTableNames] = useState({});
  const bellRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to real-time shop settings
    const unsubSettings = subscribeToShopSettings((settings) => {
      if (settings) {
        if (typeof settings.isShopOpen === "boolean") {
          setIsShopOpen(settings.isShopOpen);
        }
        if (settings.tableNames) {
          setTableNames(settings.tableNames);
        }
        setShopSettings(settings);
      }
    });

    // Set admin face
    if (auth.currentUser) {
      const email = auth.currentUser.email || "Admin User";
      const name = email.split("@")[0];
      setAdminName(name);
      setAdminLetter(name.charAt(0).toUpperCase());
    }

    // Pre-load bell chime & unlock browser autoplay
    const audio = new Audio("/bell-chime.mp3");
    audio.volume = 1.0;
    audio.preload = "auto";
    bellRef.current = audio;

    const unlock = () => {
      // First play to unlock, then reset
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(err => console.log("Audio unlock failed:", err));
      
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });

    return () => {
      unsubSettings();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Subscribe to live orders for notifications
  useEffect(() => {
    let prevCount = null;
    const unsub = subscribeToOrders((liveOrders) => {
      // Flash notification for new orders
      if (prevCount !== null && liveOrders.length > prevCount) {
        const newest = liveOrders[0];
        setNewOrderFlash(newest);
        
        // Play bell chime sound
        try {
          const audio = bellRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.volume = 1.0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error("Playback failed:", error);
              });
            }
          }
        } catch (_) {}
        
        setTimeout(() => setNewOrderFlash(null), 10000);
      }
      prevCount = liveOrders.length;
      const active = liveOrders.filter(o => o.status !== 'Completed');
      setActiveOrders(active);
    });
    return () => unsub();
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    {
      name: "Sales History",
      path: "/admin/history",
      icon: History,
      desc: "Past days records",
    },
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

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="relative transition-colors"
                style={{ padding: 10, borderRadius: 12, color: notifOpen ? '#AD4928' : '#9ca3af', background: notifOpen ? 'rgba(173,73,40,0.08)' : 'transparent' }}
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell size={20} />
                {activeOrders.length > 0 && (
                  <span
                    className="absolute"
                    style={{
                      top: 6,
                      right: 6,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "#AD4928",
                      border: "2px solid #FDFBF7",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#fff',
                      padding: '0 4px',
                    }}
                  >
                    {activeOrders.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="notif-dropdown">
                  {/* Dropdown Header */}
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <p className="font-bold" style={{ fontSize: 15, color: '#3d2b1f' }}>Notifications</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      style={{ padding: 6, borderRadius: 8, background: '#f9fafb', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Dropdown Body */}
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
                    {activeOrders.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <p style={{ fontSize: 28, marginBottom: 8 }}>🔔</p>
                        <p className="font-bold" style={{ fontSize: 14, color: '#3d2b1f' }}>All caught up!</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 }}>No pending orders right now.</p>
                      </div>
                    ) : (
                      activeOrders.slice(0, 10).map((order, i) => {
                        const statusColor = {
                          Pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
                          Preparing: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                          Served: { bg: '#f5f3ff', color: '#7c3aed', border: '#ede9fe' },
                        };
                        const sc = statusColor[order.status] || statusColor.Pending;
                        return (
                          <div
                            key={order.id}
                            style={{
                              padding: '14px 20px',
                              borderBottom: i < Math.min(activeOrders.length, 10) - 1 ? '1px solid #fafafa' : 'none',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.015)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                              setNotifOpen(false);
                              navigate('/admin/orders');
                            }}
                          >
                            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
                              <span className="font-bold" style={{ fontSize: 13, color: '#AD4928' }}>Table {order.table}</span>
                              <span className="font-bold uppercase" style={{
                                fontSize: 9,
                                letterSpacing: '0.06em',
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.border}`,
                              }}>
                                {order.status}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {order.itemsSummary || '—'}
                            </p>
                            <div className="flex items-center" style={{ gap: 8, marginTop: 4 }}>
                              <span className="font-bold" style={{ fontSize: 12, color: '#3d2b1f' }}>Rs. {order.total}</span>
                              <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                              <span className="flex items-center" style={{ fontSize: 11, color: '#9ca3af', gap: 3 }}>
                                <Clock size={10} />{timeAgo(order.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  {activeOrders.length > 0 && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/admin/orders');
                        }}
                        className="font-bold"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: 12,
                          fontSize: 13,
                          background: '#AD4928',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#8f3d21'}
                        onMouseLeave={e => e.currentTarget.style.background = '#AD4928'}
                      >
                        View All Orders →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
          <div className="admin-content-container">
            <Outlet />
          </div>
        </div>

        {/* Global New Order Flash */}
        {newOrderFlash && (
          <div className="order-flash-notification" onClick={() => {
            setNewOrderFlash(null);
            navigate('/admin/orders');
          }} style={{ cursor: 'pointer' }}>
            <div className="order-flash-timer-bar" />
            <div className="order-flash-icon-wrap">
              <Bell size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="order-flash-title">
                🔔 New Order for {tableNames[newOrderFlash.table] || `Table ${newOrderFlash.table}`}!
              </p>
              <p className="order-flash-desc">
                {newOrderFlash.itemsSummary} · Rs. {newOrderFlash.total}
              </p>
            </div>
            <ChevronRight size={18} style={{ opacity: 0.3 }} />
          </div>
        )}
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
        
        .admin-content-container {
          padding: 32px;
          padding-bottom: 48px;
          max-width: 100%;
        }
        
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 15px);
          right: 0;
          width: 400px;
          max-height: 520px;
          background: #fff;
          border-radius: 28px;
          box-shadow: 
            0 25px 70px -15px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(0,0,0,0.05);
          overflow: hidden;
          z-index: 500;
          display: flex;
          flex-direction: column;
          animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 767px) {
          .notif-dropdown {
            position: fixed;
            top: 16px;
            left: 16px;
            right: 16px;
            width: auto !important;
            max-width: none !important;
            max-height: calc(100vh - 32px);
            border-radius: 24px;
            margin: 0;
          }
        }

        .order-flash-notification {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 5000;
          width: calc(100% - 3rem);
          max-width: 24rem;
          overflow: hidden;
          background-color: #ffffff;
          border: 1px solid #f3f4f6;
          border-radius: 1.25rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: toast-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .order-flash-timer-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background-color: #AD4928;
          animation: timer-shrink 10s linear forwards;
        }

        @keyframes timer-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        .order-flash-icon-wrap {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background-color: #fdf2ed;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #AD4928;
        }

        .order-flash-title {
          font-weight: 700;
          color: #3d2b1f;
          font-size: 0.9375rem;
          margin: 0;
        }

        .order-flash-desc {
          color: #9ca3af;
          font-size: 0.8125rem;
          margin: 0.25rem 0 0 0;
        }
      `}</style>
    </div>
  );
}
