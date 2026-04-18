import { useState, useEffect } from "react";
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
} from "lucide-react";
import { subscribeToOrders, updateOrderStatus, deleteAllOrders } from "../../lib/firestoreService";
import "../styles/OrderTracking.css";

const STATUS = {
  Pending: {
    icon: PauseCircle,
    label: "Start Preparing",
    next: "Preparing"
  },
  Preparing: {
    icon: Timer,
    label: "Finish & Serve",
    next: "Served"
  },
  Served: {
    icon: Utensils,
    label: "Payed?",
    next: "Completed"
  },
  Completed: {
    icon: CheckCircle2,
    label: "Completed",
    next: null
  },
};

function timeAgo(timestamp) {
  if (!timestamp) return "just now";
  const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours > 1 ? "s" : ""} ago`;
}

export default function OrderTracking() {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLive, setIsLive] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(null);

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    let prevCount = 0;
    const unsub = subscribeToOrders((liveOrders) => {
      // Flash notification for new orders
      if (prevCount > 0 && liveOrders.length > prevCount) {
        const newest = liveOrders[0];
        setNewOrderFlash(newest);
        // Play notification sound
        try {
          const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIkqCnbihcj4nRHOYt8KhbjkqR3qbucCfazYlRHeXtsCfbDcnRnucu8GgbDgnR3uauLyeaDMjQ3SUsr2kckM1UoOfs7ynaz8xTYCds7mjazwuSn6ar7SfZzcrRHeSr7qnckE0UoKfsr2maz4wTH+cr7aiaDgrR3iSrLKfZTMoQnSSsL2ockM0U4OgsrynbD8wTYCdr7ajaDksSHqUr7OhZzQpQ3WSsLqlbz8xToGfsrynaz4wTH+cr7WiaDkrR3mTrrKfZTMoQnSSsLulbz8xToGfsLqlbD0tSn2arLKdZDQoQ3aTr7qlbz8xTYGer7WiaDkrR3qTrrKhZzYqRHaTsLqlcEIzUoKfsr2nbEAxToCesLajaDotSXuVr7ShZzYqRHaTr7mkbz0vTH+cr7ShZzUqRHWTr7ejZzMoQnOSr7mkbj0uSn2arLKdZDQnQnOSr7mkbj0uSn2arLKdZDQnQnMAAA==");
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (_) {}
        setTimeout(() => setNewOrderFlash(null), 4000);
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
    if (window.confirm("Are you sure you want to completely clear the order history? This action cannot be undone.")) {
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
          <h1 className="order-tracking-title">
            Order Tracking
          </h1>
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
          <div className={`order-tracking-live-badge ${isLive ? 'connected' : 'connecting'}`}>
            {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isLive ? "Live Connected" : "Connecting..."}
          </div>
        </div>
      </div>

      {/* New Order Flash */}
      {newOrderFlash && (
        <div className="order-flash-notification">
          <div className="order-flash-icon-wrap">
            <Bell size={22} />
          </div>
          <div>
            <p className="order-flash-title">
              🔔 New Order from Table {newOrderFlash.table}!
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
              onClick={() => setActiveFilter(activeFilter === status ? "All" : status)}
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
                  <p className="order-card-table">Table {order.table}</p>
                  <div className="order-card-time">
                    <Clock size={13} />
                    <span className="order-card-time-text">{timeAgo(order.createdAt)}</span>
                  </div>
                </div>

                {/* Customer & Items */}
                <div className="order-card-details">
                  {order.customer && order.customer !== `Table ${order.table}` && order.customer !== `Table ${order.table} Guest` && (
                    <p className="order-card-customer">{order.customer}</p>
                  )}
                  <p className="order-card-items">{order.itemsSummary || "—"}</p>
                  {order.note && (
                    <p className="order-card-note">📝 {order.note}</p>
                  )}
                </div>

                {/* Type badge */}
                <div className="order-card-badge-wrap">
                  <span className="order-card-badge">
                    <Utensils size={12} />
                    Table {order.table}
                  </span>
                </div>

                {/* Total */}
                <div className="order-card-total-wrap">
                  <p className="order-card-total">Rs. {order.total}</p>
                </div>

                {/* Action Button */}
                <div className="order-card-action-wrap">
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
    </div>
  );
}
