import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Coffee,
  DollarSign,
  Clock,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Flame,
  Eye,
  X,
} from "lucide-react";
import { subscribeToOrders } from "../../lib/firestoreService";

function timeAgo(timestamp) {
  if (!timestamp) return "just now";
  const seconds = Math.floor(
    (Date.now() - timestamp.toDate().getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours > 1 ? "s" : ""} ago`;
}

export default function Overview() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Subscribe to live orders
  useEffect(() => {
    const unsub = subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);
    });
    return () => unsub();
  }, []);

  // Derive stats from live data
  const todaysOrders = orders.length;
  const todaysRevenue = orders
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const preparingCount = orders.filter((o) => o.status === "Preparing").length;
  const servedCount = orders.filter((o) => o.status === "Served").length;
  const activeCustomers = pendingCount + preparingCount + servedCount;

  // Find top seller
  const itemCounts = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
    });
  });
  const topSeller = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    {
      name: "Today's Orders",
      value: String(todaysOrders),
      change: `${pendingCount} pending`,
      icon: ClipboardList,
      color: "#3b82f6",
      bg: "#eff6ff",
      accent: "#3b82f6",
    },
    {
      name: "Top Seller",
      value: topSeller ? topSeller[0] : "—",
      change: topSeller ? `${topSeller[1]} sold` : "—",
      icon: Flame,
      color: "#AD4928",
      bg: "rgba(173,73,40,0.08)",
      accent: "#AD4928",
    },
    {
      name: "Today's Revenue",
      value: `Rs. ${todaysRevenue.toLocaleString()}`,
      change: `${orders.filter((o) => o.status === "Completed").length} done`,
      icon: DollarSign,
      color: "#10b981",
      bg: "#ecfdf5",
      accent: "#10b981",
    },
    {
      name: "Active Tables",
      value: String(activeCustomers),
      change: "Live",
      icon: Users,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      accent: "#8b5cf6",
    },
  ];

  const statusStyles = {
    Completed: {
      bg: "#ecfdf5",
      color: "#059669",
      dot: "#10b981",
      border: "#d1fae5",
    },
    Served: {
      bg: "#f5f3ff",
      color: "#7c3aed",
      dot: "#8b5cf6",
      border: "#ede9fe",
    },
    Preparing: {
      bg: "#fffbeb",
      color: "#d97706",
      dot: "#f59e0b",
      border: "#fde68a",
    },
    Pending: {
      bg: "#f9fafb",
      color: "#6b7280",
      dot: "#9ca3af",
      border: "#e5e7eb",
    },
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        paddingBottom: 40,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div>
        <p
          className="font-bold uppercase"
          style={{
            fontSize: 12,
            letterSpacing: "0.2em",
            color: "#AD4928",
            marginBottom: 8,
          }}
        >
          {today}
        </p>
        <h1
          className="font-bold overview-title"
          style={{
            fontSize: "clamp(24px, 6vw, 32px)",
            color: "#3d2b1f",
            lineHeight: 1.2,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          Good Morning, Admin 👋
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "#9ca3af",
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          Here's a live snapshot of your shop's performance today.
        </p>
      </div>

      <style>{`
        .overview-stats-wrapper {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 12px !important;
          width: 100% !important;
        }
        @media (min-width: 768px) {
          .overview-stats-wrapper {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 480px) {
          .overview-stats-wrapper {
            gap: 8px !important;
          }
        }
        .main-overview-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .main-overview-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>



      {/* ── Stats ── */}
      <div className="overview-stats-wrapper">
        {stats.map((stat) => (
          <div
            key={stat.name}
            style={{
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid #f3f4f6",
              borderTop: `4px solid ${stat.color}`,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
              transition: "transform 0.2s, box-shadow 0.2s",
              minWidth: 0,
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: stat.bg,
                  color: stat.color,
                }}
              >
                <stat.icon size={22} strokeWidth={2.5} />
              </div>
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ 
                  background: "#f0fdf4", 
                  border: "1px solid #dcfce7",
                  color: "#16a34a",
                  fontSize: 10,
                  fontWeight: 700
                }}
              >
                <TrendingUp size={12} />
                <span>{stat.change}</span>
              </div>
            </div>
            <div className="text-left w-full mt-2">
              <p
                className="font-bold uppercase"
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: "0.05em",
                  marginBottom: 8
                }}
              >
                {stat.name}
              </p>
              <p
                className="font-bold"
                style={{ 
                  fontSize: "clamp(24px, 6vw, 32px)", 
                  color: "#3d2b1f", 
                  lineHeight: 1
                }}
              >
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Orders + Performance ── */}
      <div
        id="main-grid"
        className="main-overview-grid"
      >
        {/* Recent Orders */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: "24px 28px",
              borderBottom: "1px solid #fafafa",
              flexShrink: 0,
            }}
          >
            <div>
              <h2
                className="font-bold"
                style={{ fontSize: 18, color: "#3d2b1f" }}
              >
                Recent Orders
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  fontStyle: "italic",
                  marginTop: 4,
                }}
              >
                Live updates from table orders
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/orders")}
              className="flex items-center font-bold uppercase transition-colors"
              style={{
                gap: 4,
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "#AD4928",
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#8f3d21")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#AD4928")}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {/* Scrollable Rows – 5 visible, scroll for more */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
            {orders.length === 0 ? (
              <div style={{ padding: "48px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🍵</p>
                <p
                  className="font-bold"
                  style={{ fontSize: 15, color: "#3d2b1f", marginBottom: 4 }}
                >
                  No orders yet
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#9ca3af",
                    fontStyle: "italic",
                  }}
                >
                  Orders from table QR scans will appear here live.
                </p>
              </div>
            ) : (
              orders.map((order, i) => {
                const s = statusStyles[order.status] || statusStyles.Pending;
                return (
                  <div
                    key={order.id}
                    className="flex items-center transition-colors"
                    style={{
                      padding: "18px 28px",
                      gap: 16,
                      borderBottom:
                        i < Math.min(orders.length, 20) - 1
                          ? "1px solid #fafafa"
                          : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(0,0,0,0.015)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="flex items-center"
                        style={{ gap: 10, marginBottom: 5 }}
                      >
                        <span
                          className="font-bold"
                          style={{ fontSize: 14, color: "#AD4928" }}
                        >
                          Table {order.table}
                        </span>
                        <span
                          className="flex items-center font-bold uppercase"
                          style={{
                            gap: 5,
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: s.bg,
                            color: s.color,
                            border: `1px solid ${s.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: s.dot,
                            }}
                          />
                          {order.status}
                        </span>
                        {order.customer &&
                          order.customer !== `Table ${order.table}` &&
                          order.customer !== `Table ${order.table} Guest` && (
                            <>
                              <span style={{ fontSize: 12, color: "#d1d5db" }}>
                                ·
                              </span>
                              <span
                                className="font-bold"
                                style={{ fontSize: 12, color: "#9ca3af" }}
                              >
                                {order.customer}
                              </span>
                            </>
                          )}
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.itemsSummary || "—"}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <p
                          className="font-bold"
                          style={{ fontSize: 15, color: "#3d2b1f" }}
                        >
                          Rs. {order.total}
                        </p>
                        <p
                          className="flex items-center justify-end"
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            gap: 4,
                            marginTop: 3,
                          }}
                        >
                          <Clock size={11} />
                          {timeAgo(order.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "#f8f5f2",
                          color: "#AD4928",
                          border: "1px solid #f0ebe5",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#AD4928";
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.borderColor = "#AD4928";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f8f5f2";
                          e.currentTarget.style.color = "#AD4928";
                          e.currentTarget.style.borderColor = "#f0ebe5";
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance Card */}
        <div
          className="flex flex-col justify-between relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #AD4928 0%, #6b2710 100%)",
            borderRadius: 20,
            padding: 28,
            color: "#fff",
            boxShadow: "0 12px 40px rgba(173,73,40,0.3)",
            minHeight: 380,
          }}
        >
          {/* Decorative icon */}
          <div
            className="absolute pointer-events-none"
            style={{ bottom: -16, right: -16, opacity: 0.06 }}
          >
            <Coffee size={200} />
          </div>

          <div
            className="relative"
            style={{ display: "flex", flexDirection: "column", gap: 28 }}
          >
            <div>
              <p
                className="font-bold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  color: "rgba(255,255,255,0.45)",
                  marginBottom: 8,
                }}
              >
                Live Stats
              </p>
              <h3
                className="font-bold"
                style={{ fontSize: 22, lineHeight: 1.3 }}
              >
                Shop Performance
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  fontStyle: "italic",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {todaysOrders > 0
                  ? `${todaysOrders} order${todaysOrders > 1 ? "s" : ""} served today so far.`
                  : "No orders yet today. Waiting for the first scan!"}
              </p>
            </div>

            {/* Order Status Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                {
                  label: "Completed",
                  pct:
                    todaysOrders > 0
                      ? Math.round(
                          (orders.filter((o) => o.status === "Completed")
                            .length /
                            todaysOrders) *
                            100,
                        )
                      : 0,
                },
                {
                  label: "In Progress",
                  pct:
                    todaysOrders > 0
                      ? Math.round(
                          ((pendingCount + preparingCount + servedCount) /
                            todaysOrders) *
                            100,
                        )
                      : 0,
                },
              ].map((bar) => (
                <div key={bar.label}>
                  <div
                    className="flex justify-between font-bold uppercase"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 8,
                    }}
                  >
                    <span>{bar.label}</span>
                    <span>{bar.pct}%</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      width: "100%",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        width: `${bar.pct}%`,
                        background:
                          bar.pct > 50 ? "#ffffff" : "rgba(255,255,255,0.55)",
                        boxShadow:
                          bar.pct > 50
                            ? "0 0 10px rgba(255,255,255,0.3)"
                            : "none",
                        transition: "width 1s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative"
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              className="font-bold uppercase"
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.2em",
                marginBottom: 6,
              }}
            >
              Today's Total Revenue
            </p>
            <div className="flex items-end justify-between">
              <p className="font-bold" style={{ fontSize: 32 }}>
                Rs. {todaysRevenue.toLocaleString()}
              </p>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <ArrowUpRight size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px 28px",
                background: "#AD4928",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  className="font-bold uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.6 }}
                >
                  Order Details
                </p>
                <h3
                  className="font-bold"
                  style={{ fontSize: 22, marginTop: 4 }}
                >
                  Table {selectedOrder.table}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Customer & Status */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    className="font-bold uppercase"
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      letterSpacing: "0.15em",
                      marginBottom: 4,
                    }}
                  >
                    Customer
                  </p>
                  <p
                    className="font-bold"
                    style={{ fontSize: 16, color: "#3d2b1f" }}
                  >
                    {!selectedOrder.customer ||
                    selectedOrder.customer === `Table ${selectedOrder.table}` ||
                    selectedOrder.customer ===
                      `Table ${selectedOrder.table} Guest`
                      ? "Anonymous"
                      : selectedOrder.customer}
                  </p>
                </div>
                <span
                  className="font-bold uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    padding: "5px 14px",
                    borderRadius: 999,
                    ...(statusStyles[selectedOrder.status] ||
                      statusStyles.Pending),
                    background: (
                      statusStyles[selectedOrder.status] || statusStyles.Pending
                    ).bg,
                    color: (
                      statusStyles[selectedOrder.status] || statusStyles.Pending
                    ).color,
                    border: `1px solid ${(statusStyles[selectedOrder.status] || statusStyles.Pending).border}`,
                  }}
                >
                  {selectedOrder.status}
                </span>
              </div>

              {/* Items */}
              <div>
                <p
                  className="font-bold uppercase"
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    letterSpacing: "0.15em",
                    marginBottom: 10,
                  }}
                >
                  Items Ordered
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {(selectedOrder.items || []).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#fdfbf7",
                        borderRadius: 12,
                      }}
                    >
                      <div>
                        <p
                          className="font-bold"
                          style={{ fontSize: 14, color: "#3d2b1f" }}
                        >
                          {item.name}
                        </p>
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>
                          Qty: {item.qty}
                        </p>
                      </div>
                      <p
                        className="font-bold"
                        style={{ fontSize: 14, color: "#AD4928" }}
                      >
                        Rs. {item.price * item.qty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              {selectedOrder.note && (
                <div>
                  <p
                    className="font-bold uppercase"
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      letterSpacing: "0.15em",
                      marginBottom: 6,
                    }}
                  >
                    Special Note
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      fontStyle: "italic",
                      padding: "10px 14px",
                      background: "#fffbeb",
                      borderRadius: 12,
                      border: "1px solid #fde68a",
                    }}
                  >
                    📝 {selectedOrder.note}
                  </p>
                </div>
              )}

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderTop: "2px solid #f3f4f6",
                }}
              >
                <p
                  className="font-bold uppercase"
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    letterSpacing: "0.1em",
                  }}
                >
                  Total
                </p>
                <p
                  className="font-bold"
                  style={{ fontSize: 24, color: "#3d2b1f" }}
                >
                  Rs. {selectedOrder.total}
                </p>
              </div>

              {/* Time */}
              <p
                className="flex items-center"
                style={{ fontSize: 12, color: "#9ca3af", gap: 4 }}
              >
                <Clock size={12} /> Ordered {timeAgo(selectedOrder.createdAt)}
              </p>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 28px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  navigate("/admin/orders");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#AD4928",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#8f3d21")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#AD4928")
                }
              >
                Go to Order Tracking
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#f3f4f6",
                  color: "#6b7280",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#e5e7eb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive overrides */}
      <style>
        {`
        @media (max-width: 1200px) {
          #main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          #stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          #stats-grid { grid-template-columns: 1fr !important; }
        }
      `}
      </style>
    </div>
  );
}
