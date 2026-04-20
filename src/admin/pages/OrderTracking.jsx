import { useState, useEffect, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  Timer,
  PauseCircle,
  Utensils,
  Wifi,
  WifiOff,
  Bell,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import {
  subscribeToOrders,
  updateOrderStatus,
  deleteAllOrders,
  subscribeToShopSettings,
} from "../../lib/firestoreService";
import "../styles/OrderTracking.css";

const STATUS = {
  Pending: {
    icon: PauseCircle,
    label: "Start Preparing",
    next: "Preparing",
  },
  Preparing: {
    icon: Timer,
    label: "Finish & Serve",
    next: "Served",
  },
  Served: {
    icon: Utensils,
    label: "Payed?",
    next: "Completed",
  },
  Completed: {
    icon: CheckCircle2,
    label: "Completed",
    next: null,
  },
};

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

const statusStyles = {
  Completed: { bg: "#ecfdf5", color: "#059669", border: "#d1fae5" },
  Served: { bg: "#f5f3ff", color: "#7c3aed", border: "#ede9fe" },
  Preparing: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  Pending: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

export default function OrderTracking() {
  const [orders, setOrders] = useState([]);
  const [tableNames, setTableNames] = useState({});
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLive, setIsLive] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const bellRef = useRef(null);

  // Pre-load bell chime & unlock browser autoplay on first interaction
  useEffect(() => {
    const audio = new Audio("/bell-chime.mp3");
    audio.volume = 0.5;
    audio.preload = "auto";
    bellRef.current = audio;

    // Subscribe to shop settings for table names
    const unsubSettings = subscribeToShopSettings((settings) => {
      if (settings && settings.tableNames) {
        setTableNames(settings.tableNames);
      }
    });

    const unlock = () => {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {});
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    return () => {
      unsubSettings();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    let prevCount = 0;
    const unsub = subscribeToOrders((liveOrders) => {
      // Flash notification for new orders
      if (prevCount > 0 && liveOrders.length > prevCount) {
        const newest = liveOrders[0];
        setNewOrderFlash(newest);
        // Play bell chime sound (3 seconds)
        try {
          const audio = bellRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            setTimeout(() => {
              audio.pause();
              audio.currentTime = 0;
            }, 3000);
          }
        } catch (_) {}
        setTimeout(() => setNewOrderFlash(null), 10000);
      }
      prevCount = liveOrders.length;
      setOrders(liveOrders);
      setIsLive(true);
    });

    return () => unsub();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error("Failed to update order:", err);
    }
  };

  const handleClearOrders = async () => {
    if (orders.length === 0) return;
    if (
      window.confirm(
        "Are you sure you want to completely clear the order history? This action cannot be undone.",
      )
    ) {
      try {
        await deleteAllOrders(orders);
      } catch (err) {
        console.error("Failed to clear orders:", err);
      }
    }
  };

  const counts = {
    Pending: orders.filter((o) => o.status === "Pending").length,
    Preparing: orders.filter((o) => o.status === "Preparing").length,
    Served: orders.filter((o) => o.status === "Served").length,
    Completed: orders.filter((o) => o.status === "Completed").length,
  };

  const filtered =
    activeFilter === "All"
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="order-tracking-container">
      {/* Header */}
      <div className="order-tracking-header">
        <div>
          <h1 className="order-tracking-title">Order Tracking</h1>
          <p className="order-tracking-subtitle">
            Live orders from table QR scans appear here in real-time.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {orders.length > 0 && (
            <button
              onClick={handleClearOrders}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
              Clear All Orders
            </button>
          )}
          <div
            className={`order-tracking-live-badge ${isLive ? "connected" : "connecting"}`}
          >
            {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isLive ? "Live Connected" : "Connecting..."}
          </div>
        </div>
      </div>

      {/* New Order Flash */}
      {newOrderFlash && (
        <div className="order-flash-notification">
          <div className="order-flash-timer-bar" />
          <div className="order-flash-icon-wrap">
            <Bell size={22} />
          </div>
          <div>
            <p className="order-flash-title">
              🔔 New Order from {tableNames[newOrderFlash.table] || `Table ${newOrderFlash.table}`}!
            </p>
            <p className="order-flash-desc">
              {newOrderFlash.itemsSummary} · Rs. {newOrderFlash.total}
            </p>
          </div>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="order-summary-grid">
        {["Pending", "Preparing", "Served", "Completed"].map((status) => {
          const cfg = STATUS[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              onClick={() =>
                setActiveFilter(activeFilter === status ? "All" : status)
              }
              className={`order-summary-card ${activeFilter === status ? `active-${status}` : ""}`}
            >
              <div className={`order-summary-icon ${status}`}>
                <Icon size={22} />
              </div>
              <p className="order-summary-count">{counts[status]}</p>
              <p className={`order-summary-label ${status}`}>{status}</p>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="order-list-section">
        <div className="order-list-header">
          <h2 className="order-list-title">
            {activeFilter === "All" ? "All Orders" : `${activeFilter} Orders`}
            <span className="order-list-title-count">({filtered.length})</span>
          </h2>
          {activeFilter !== "All" && (
            <button
              onClick={() => setActiveFilter("All")}
              className="order-list-show-all"
            >
              Show All
            </button>
          )}
        </div>

        {filtered.map((order) => {
          const cfg = STATUS[order.status] || STATUS.Pending;
          return (
            <div key={order.id} className="order-card">
              {/* Color bar */}
              <div className={`order-card-bar ${order.status}`} />

              <div className="order-card-body">
                {/* Table & Time */}
                <div className="order-card-info-main">
                  <p className="order-card-table">
                    {tableNames[order.table] || `Table ${order.table}`}
                  </p>
                  <div className="order-card-time">
                    <Clock size={13} />
                    <span className="order-card-time-text">
                      {timeAgo(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Customer & Items */}
                <div className="order-card-details">
                  {order.customer &&
                    order.customer !== `Table ${order.table}` &&
                    order.customer !== `Table ${order.table} Guest` && (
                      <p className="order-card-customer">{order.customer}</p>
                    )}
                  <p className="order-card-items">
                    {order.itemsSummary || "—"}
                  </p>
                  {order.note && (
                    <p className="order-card-note">📝 {order.note}</p>
                  )}
                </div>

                {/* Type badge */}
                <div className="order-card-badge-wrap">
                  <span className="order-card-badge">
                    <Utensils size={12} />
                    {tableNames[order.table] || `Table ${order.table}`}
                  </span>
                </div>

                {/* Total */}
                <div className="order-card-total-wrap">
                  <p className="order-card-total">Rs. {order.total}</p>
                </div>

                {/* Action Button */}
                <div
                  className="order-card-action-wrap"
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "#f8f5f2",
                      color: "#AD4928",
                      border: "1px solid #f0ebe5",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
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
                    <Eye size={16} /> View
                  </button>

                  {cfg.next ? (
                    <button
                      onClick={() => handleStatusChange(order.id, cfg.next)}
                      className={`order-card-btn ${order.status}`}
                    >
                      {cfg.label}
                    </button>
                  ) : (
                    <span className="order-card-done">
                      <CheckCircle2 size={18} /> Done
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="order-empty-state">
            <p className="order-empty-icon">🍵</p>
            <h3 className="order-empty-title">
              {orders.length === 0 ? "Waiting for orders..." : "No orders here"}
            </h3>
            <p className="order-empty-desc">
              {orders.length === 0
                ? "When a customer scans a table QR and places an order, it will appear here instantly."
                : "All quiet in this category."}
            </p>
          </div>
        )}
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
                  {tableNames[selectedOrder.table] || `Table ${selectedOrder.table}`}
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
                onClick={() => setSelectedOrder(null)}
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
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
