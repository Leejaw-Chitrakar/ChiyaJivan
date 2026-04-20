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
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Subscribe to shop settings for table names
  useEffect(() => {
    const unsubSettings = subscribeToShopSettings((settings) => {
      if (settings && settings.tableNames) {
        setTableNames(settings.tableNames);
      }
    });

    return () => unsubSettings();
  }, []);

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    let prevCount = null;
    const unsub = subscribeToOrders((liveOrders) => {
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

  // Grouping logic
  const tableGroups = orders.reduce((acc, order) => {
    if (order.status === "Completed") return acc; // Only live orders
    const tableId = order.table;
    if (!acc[tableId]) {
      acc[tableId] = {
        tableId,
        tableName: tableNames[tableId] || `Table ${tableId}`,
        orders: [],
        total: 0,
        items: [],
        customer: order.customer,
        createdAt: order.createdAt,
        note: order.note
      };
    }
    acc[tableId].orders.push(order);
    acc[tableId].total += order.total;
    acc[tableId].items.push(...(order.items || []));
    if (order.note && !acc[tableId].note) acc[tableId].note = order.note;
    // Earliest order for timing
    if (order.createdAt && (!acc[tableId].createdAt || order.createdAt < acc[tableId].createdAt)) {
      acc[tableId].createdAt = order.createdAt;
    }
    return acc;
  }, {});

  const tableList = Object.values(tableGroups).sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());

  const counts = {
    Pending: tableList.filter(t => t.orders.some(o => o.status === "Pending")).length,
    Preparing: tableList.filter(t => t.orders.some(o => o.status === "Preparing")).length,
    Served: tableList.filter(t => t.orders.some(o => o.status === "Served")).length,
    Completed: orders.filter(o => o.status === "Completed").length,
  };

  const filteredTables = activeFilter === "All" 
    ? tableList 
    : tableList.filter(t => t.orders.some(o => o.status === activeFilter));

  return (
    <div className="order-tracking-container">
      {/* Header */}
      <div className="order-tracking-header">
        <div>
          <h1 className="order-tracking-title">Order Tracking</h1>
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
            {activeFilter === "All" ? "Live Tables" : `${activeFilter} Tables`}
            <span className="order-list-title-count">({filteredTables.length})</span>
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

        {filteredTables.map((table) => {
          // Determine the "main" status to show for the table card styling
          // Preference: Pending > Preparing > Served
          const statuses = table.orders.map(o => o.status);
          const priorityStatus = 
            statuses.includes("Pending") ? "Pending" :
            statuses.includes("Preparing") ? "Preparing" :
            statuses.includes("Served") ? "Served" : "Completed";

          const itemsSummary = table.items.map(i => `${i.name} x${i.qty}`).join(", ");

          return (
            <div key={table.tableId} className="order-card">
              {/* Color bar based on priority status */}
              <div className={`order-card-bar ${priorityStatus}`} />

              <div className="order-card-body">
                {/* Table & Time */}
                <div className="order-card-info-main">
                  <p className="order-card-table">
                    {table.tableName}
                  </p>
                  <div className="order-card-time">
                    <Clock size={13} />
                    <span className="order-card-time-text">
                      {timeAgo(table.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Customer & Items */}
                <div className="order-card-details">
                  {table.customer && table.customer !== table.tableName && (
                    <p className="order-card-customer">{table.customer}</p>
                  )}
                  <p className="order-card-items">
                    {itemsSummary || "—"}
                  </p>
                  {table.note && (
                    <p className="order-card-note">📝 {table.note}</p>
                  )}
                </div>

                <div className="order-card-status-list">
                  {table.orders.map((subOrder, idx) => {
                    const subCfg = STATUS[subOrder.status] || STATUS.Pending;
                    return (
                      <div key={subOrder.id} className="sub-order-row">
                         <span className="sub-order-label">ORDER #{idx+1}</span>
                         <span className={`order-card-badge ${subOrder.status}`} style={{ margin: 0, padding: '4px 10px', fontSize: '10px' }}>
                            {subOrder.status}
                         </span>
                         <div style={{ flex: 1 }} />
                         {subCfg.next && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(subOrder.id, subCfg.next);
                              }}
                              className={`order-card-btn ${subOrder.status}`}
                              style={{ padding: '6px 14px', fontSize: '11px', height: 'auto', fontWeight: 800 }}
                            >
                              {subCfg.label}
                            </button>
                         )}
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="order-card-total-wrap">
                  <p className="order-card-total">Total: Rs. {table.total}</p>
                </div>

                <div className="order-card-action-wrap">
                  <button
                    onClick={() => setSelectedOrder(table)}
                    className="view-btn-custom"
                  >
                    <Eye size={16} /> Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTables.length === 0 && (
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
                  {selectedOrder.tableName || `Table ${selectedOrder.table}`}
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
              {/* Customer & Total Orders */}
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
                    {selectedOrder.customer && selectedOrder.customer !== selectedOrder.tableName ? selectedOrder.customer : "Anonymous"}
                  </p>
                </div>
                <div className="text-right">
                   <p className="font-bold uppercase" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.15em", marginBottom: 4 }}>Active Orders</p>
                   <p className="font-bold" style={{ fontSize: 16, color: "#AD4928" }}>{selectedOrder.orders?.length || 1}</p>
                </div>
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
                  Combined Items
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
                    Notes
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
                  Total Bill
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
                <Clock size={12} /> First ordered {timeAgo(selectedOrder.createdAt)}
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
