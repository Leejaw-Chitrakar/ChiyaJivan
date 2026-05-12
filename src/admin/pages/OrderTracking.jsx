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
  ArrowLeft,
  RefreshCcw,
} from "lucide-react";
import {
  subscribeToOrders,
  updateOrderStatus,
  updateOrderPaymentAndStatus,
  bulkCompleteTable,
  updateTableOccupancy,
  deleteAllOrders,
  subscribeToShopSettings,
  updateOrderItems,
  subscribeToMenuItems,
  resetAllTables,
  recordKhataPayment,
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
  Cancelled: {
    icon: X,
    label: "Cancelled",
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
  Cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fee2e2" },
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

  // Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isTableEmpty, setIsTableEmpty] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItems, setEditingItems] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null); // The specific order doc ID we are editing
  const audioRef = useRef(null);

  // Subscribe to shop settings for table names
  useEffect(() => {
    const unsubSettings = subscribeToShopSettings((settings) => {
      if (settings && settings.tableNames) {
        setTableNames(settings.tableNames);
      }
    });

    return () => unsubSettings();
  }, []);

  // Subscribe to menu items
  useEffect(() => {
    const unsubMenu = subscribeToMenuItems((items) => {
      setMenuItems(items);
    });
    return () => unsubMenu();
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      console.log("🔔 Playing notification sound...");
      audioRef.current.play().catch(e => {
        console.error("❌ Audio play failed:", e);
        // Fallback or alert if needed
      });
    } else {
      console.error("❌ audioRef.current is null!");
    }
  };

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    let lastOrderCount = null;
    const unsub = subscribeToOrders((liveOrders) => {
      console.log("📦 Orders updated. Count:", liveOrders.length, "Prev:", lastOrderCount);

      // If we have more orders than before, play sound
      if (lastOrderCount !== null && liveOrders.length > lastOrderCount) {
        playNotificationSound();
      }

      lastOrderCount = liveOrders.length;
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

  const handleBulkStatusChange = async (tableOrders, fromStatus, toStatus) => {
    try {
      const targetOrders = tableOrders.filter(o => o.status === fromStatus);
      const promises = targetOrders.map(o => updateOrderStatus(o.id, toStatus));
      await Promise.all(promises);
    } catch (err) {
      console.error("Failed bulk status update:", err);
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

  const handleCancelTable = async (tableOrders) => {
    if (window.confirm("Are you sure you want to CANCEL all orders for this table?")) {
      try {
        const promises = tableOrders.map(o => updateOrderStatus(o.id, "Cancelled"));
        await Promise.all(promises);
      } catch (err) {
        console.error("Failed to cancel table orders:", err);
      }
    }
  };

  const handleCancelSingleOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      try {
        await updateOrderStatus(orderId, "Cancelled");
        setSelectedOrder(null);
      } catch (err) {
        console.error("Failed to cancel order:", err);
      }
    }
  };

  const handleStartEditing = (order) => {
    setEditingOrderId(order.id);
    setEditingItems([...(order.items || [])]);
    setIsEditing(true);
  };

  const handleUpdateItemQty = (index, delta) => {
    setEditingItems(prev => {
      const updated = [...prev];
      const newQty = (updated[index].qty || 0) + delta;
      if (newQty > 0) {
        updated[index].qty = newQty;
      }
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = (menuItem) => {
    setEditingItems(prev => {
      // Check if item already exists
      const existingIdx = prev.findIndex(i => i.id === menuItem.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [...prev, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: 1,
        category: menuItem.category
      }];
    });
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrderId) return;
    try {
      const newTotal = editingItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
      await updateOrderItems(editingOrderId, editingItems, newTotal);

      // Update the selectedOrder locally if it's the one we're viewing
      if (selectedOrder) {
        const updatedOrders = selectedOrder.orders.map(o =>
          o.id === editingOrderId ? { ...o, items: editingItems, total: newTotal } : o
        );
        // Recalculate combined items for the table group
        const combinedItemsMap = {};
        updatedOrders.forEach(o => {
          o.items.forEach(i => {
            if (combinedItemsMap[i.id]) combinedItemsMap[i.id].qty += i.qty;
            else combinedItemsMap[i.id] = { ...i };
          });
        });

        setSelectedOrder({
          ...selectedOrder,
          orders: updatedOrders,
          items: Object.values(combinedItemsMap),
          total: updatedOrders.reduce((sum, o) => sum + o.total, 0)
        });
      }

      setIsEditing(false);
      setEditingOrderId(null);
      alert("Order updated successfully!");
    } catch (err) {
      console.error("Failed to save edited order:", err);
      alert("Failed to update order.");
    }
  };

  // Grouping logic
  const tableGroups = orders.reduce((acc, order) => {
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
        note: order.note,
        hasLiveOrders: false
      };
    }
    acc[tableId].orders.push(order);
    if (order.status !== "Completed" && order.status !== "Cancelled") acc[tableId].hasLiveOrders = true;

    // Keep sub-orders sorted by time
    acc[tableId].orders.sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
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
    Cancelled: orders.filter(o => o.status === "Cancelled").length,
  };

  const filteredTables = (() => {
    if (activeFilter === "All") return tableList.filter(t => t.hasLiveOrders);

    if (activeFilter === "Completed") {
      // Return individual completed orders as "pseudo-tables" so they list separately
      return orders
        .filter(o => o.status === "Completed")
        .map(o => ({
          tableId: o.id,
          tableName: tableNames[o.table] || `Table ${o.table}`,
          tableNum: o.table,
          orders: [o],
          total: o.total,
          items: o.items || [],
          customer: o.customer,
          createdAt: o.createdAt,
          note: o.note,
          isSingleOrder: true
        }));
    }

    if (activeFilter === "Cancelled") {
      return orders
        .filter(o => o.status === "Cancelled")
        .map(o => ({
          tableId: o.id,
          tableName: tableNames[o.table] || `Table ${o.table}`,
          tableNum: o.table,
          orders: [o],
          total: o.total,
          items: o.items || [],
          customer: o.customer,
          createdAt: o.createdAt,
          note: o.note,
          isSingleOrder: true
        }));
    }

    return tableList.filter(t => t.orders.some(o => o.status === activeFilter));
  })();

  return (
    <div className="order-tracking-container">
      {/* Audio for notifications */}
      <audio ref={audioRef} src="/bell-chime.mp3" preload="auto" />

      {/* Header */}
      <div className="order-tracking-header">
        <div>
          <h1 className="order-tracking-title">Order Tracking</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={playNotificationSound}
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
              background: "#fdf2ed",
              color: "#ad4928",
              border: "1px solid #fce3d9",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Bell size={16} /> Test Sound
          </button>
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
        {["Pending", "Preparing", "Served", "Completed", "Cancelled"].map((status) => {
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

                {/* Consolidated Items List */}
                <div className="order-card-details" style={{ marginBottom: 12 }}>
                  {table.customer && table.customer !== table.tableName && (
                    <p className="order-card-customer" style={{ marginBottom: 6 }}>{table.customer}</p>
                  )}
                  <div style={{
                    background: "#f9fafb",
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid #f3f4f6"
                  }}>
                    <p className="order-card-items" style={{ fontSize: 15, color: "#3d2b1f", fontWeight: "600", lineHeight: 1.5 }}>
                      {table.items.map(i => `${i.name} x${i.qty}`).join(", ")}
                    </p>
                  </div>
                  {table.note && (
                    <p className="order-card-note" style={{ marginTop: 8 }}>📝 {table.note}</p>
                  )}
                </div>

                <div className="order-card-action-section" style={{
                  borderTop: "1px dashed #e5e7eb",
                  paddingTop: 16,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table Status</p>
                    <div>
                      {(() => {
                        const statuses = table.orders.map(o => o.status);
                        let displayStatus = "Completed";
                        if (statuses.includes("Pending")) displayStatus = "Pending";
                        else if (statuses.includes("Preparing")) displayStatus = "Preparing";
                        else if (statuses.includes("Served")) displayStatus = "Served";

                        return (
                          <span className={`order-card-badge ${displayStatus}`} style={{ margin: 0, padding: '4px 12px', fontSize: '11px', borderRadius: 8 }}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Single Bulk Action Button */}
                    {(() => {
                      const statuses = table.orders.map(o => o.status);

                      // If everything is completed or cancelled, don't show any action button
                      if (statuses.every(s => s === "Completed" || s === "Cancelled")) return null;

                      let primaryStatus = "Served";
                      if (statuses.includes("Pending")) primaryStatus = "Pending";
                      else if (statuses.includes("Preparing")) primaryStatus = "Preparing";

                      const cfg = STATUS[primaryStatus];
                      if (!cfg || !cfg.next) return null;

                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cfg.next === "Completed") {
                              setPaymentModalOrder(table);
                              setIsTableEmpty(true); // Default to empty after pay
                            } else {
                              handleBulkStatusChange(table.orders, primaryStatus, cfg.next);
                            }
                          }}
                          className={`order-card-btn ${primaryStatus}`}
                          style={{ padding: '8px 18px', fontSize: '11px', fontWeight: 800, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })()}

                    {/* Cancel Table Button */}
                    {table.hasLiveOrders && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTable(table.orders);
                        }}
                        className="order-card-btn Cancelled"
                        style={{
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          borderRadius: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca'
                        }}
                      >
                        Cancel All
                      </button>
                    )}
                  </div>
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
              borderRadius: 16,
              maxWidth: 350,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "14px 20px",
                background: isEditing ? "#3b82f6" : "#AD4928",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.3s"
              }}
            >
              <div>
                <p
                  className="font-bold uppercase"
                  style={{ fontSize: 8, letterSpacing: "0.2em", opacity: 0.6 }}
                >
                  {isEditing ? "Editing Order" : "Order Details"}
                </p>
                <h3
                  className="font-bold"
                  style={{ fontSize: 16, marginTop: 2 }}
                >
                  {selectedOrder.tableName || `Table ${selectedOrder.table}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setSelectedOrder(null);
                  }
                }}
                style={{
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                {isEditing ? <ArrowLeft size={18} /> : <X size={18} />}
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: "70vh",
                overflowY: "auto"
              }}
            >
              {!isEditing ? (
                <>
                  {/* View Mode: List Individual Orders */}
                  {selectedOrder.orders?.map((order, idx) => (
                    <div key={order.id} style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 12, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>ORDER #{idx + 1}</p>
                        {order.status !== "Completed" && order.status !== "Cancelled" && (
                          <button
                            onClick={() => handleStartEditing(order)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "4px 8px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #dbeafe",
                              borderRadius: 6,
                              cursor: "pointer"
                            }}
                          >
                            Modify
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {order.items?.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span>{item.name} x{item.qty}</span>
                            <span style={{ fontWeight: 600 }}>Rs. {item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 8, paddingTop: 12, borderTop: "2px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Total Bill</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#3d2b1f" }}>Rs. {selectedOrder.total}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Mode: Modify Items */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 12 }}>Modify Items</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {editingItems.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", padding: 8, borderRadius: 10 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 700 }}>{item.name}</p>
                            <p style={{ fontSize: 10, color: "#9ca3af" }}>Rs. {item.price}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => handleUpdateItemQty(i, -1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>-</button>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                            <button onClick={() => handleUpdateItemQty(i, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>+</button>
                            <button onClick={() => handleRemoveItem(i)} style={{ marginLeft: 4, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Item Section */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e5e7eb" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Add New Item</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto", padding: "4px" }}>
                      {menuItems.filter(mi => mi.stock !== false).map(mi => (
                        <button
                          key={mi.id}
                          onClick={() => handleAddItem(mi)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: "#fff",
                            border: "1px solid #f3f4f6",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 11,
                            textAlign: "left"
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{mi.name}</span>
                          <span style={{ color: "#AD4928" }}>Rs. {mi.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, padding: 12, background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>New Total</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#3d2b1f" }}>Rs. {editingItems.reduce((sum, item) => sum + (item.price * item.qty), 0)}</p>
                    </div>
                  </div>
                </>
              )}
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
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#f3f4f6",
                      color: "#4b5563",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    Close
                  </button>
                  {selectedOrder.hasLiveOrders && (
                    <button
                      onClick={() => {
                        handleCancelTable(selectedOrder.orders);
                        setSelectedOrder(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 14,
                        fontSize: 13,
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Cancel All
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#f3f4f6",
                      color: "#4b5563",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveEditedOrder}
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Confirmation Modal ── */}
      {paymentModalOrder && (
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
          onClick={() => setPaymentModalOrder(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", background: "#fdfbf7", borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold" style={{ fontSize: 16, color: "#3d2b1f" }}>Confirm Payment</h3>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                Complete order for {paymentModalOrder.tableName || `Table ${paymentModalOrder.table || paymentModalOrder.tableId}`}
              </p>
            </div>

            <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p className="font-bold" style={{ fontSize: 11, color: "#3d2b1f", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Payment Method</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Cash", "Online"].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: 10,
                        border: `2px solid ${paymentMethod === method ? "#AD4928" : "#e5e7eb"}`,
                        background: paymentMethod === method ? "#fdf2ed" : "#fff",
                        color: paymentMethod === method ? "#AD4928" : "#6b7280",
                        fontWeight: "bold",
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold" style={{ fontSize: 11, color: "#3d2b1f", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Note (Optional)</p>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Paid via eSewa, tip included..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontSize: 12,
                    minHeight: 52,
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <p className="font-bold" style={{ fontSize: 11, color: "#3d2b1f", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Discount (Rs.)</p>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-bold" style={{ fontSize: 11, color: "#3d2b1f", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Cash Received (Rs.)</p>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={`Rs. ${paymentModalOrder.total - (parseFloat(discountAmount) || 0)}`}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: cashReceived !== "" && Number(cashReceived) < (paymentModalOrder.total - (parseFloat(discountAmount) || 0))
                        ? "1.5px solid #AD4928"
                        : "1px solid #e5e7eb",
                      background: "#f9fafb",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {cashReceived !== "" && Number(cashReceived) < (paymentModalOrder.total - (parseFloat(discountAmount) || 0)) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "#fef9f7", border: "1px solid #fde3d5", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>⚠️</span>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#AD4928" }}>
                      Due: Rs. {Math.max(0, (paymentModalOrder.total - (parseFloat(discountAmount) || 0)) - Number(cashReceived)).toFixed(0)} — will be recorded to Khata
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      style={{ flex: 1, padding: "5px 9px", borderRadius: 8, border: "1px solid #fde3d5", background: "#fff", fontSize: 11, outline: "none" }}
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      style={{ flex: 1, padding: "5px 9px", borderRadius: 8, border: "1px solid #fde3d5", background: "#fff", fontSize: 11, outline: "none" }}
                    />
                  </div>
                </div>
              )}

              {/* Table Empty Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: isTableEmpty ? '#f0fdf4' : '#fff7ed',
                  borderRadius: 10,
                  border: `1px solid ${isTableEmpty ? '#bcf0da' : '#ffedd5'}`,
                  cursor: 'pointer'
                }}
                onClick={() => setIsTableEmpty(!isTableEmpty)}
              >
                <input
                  type="checkbox"
                  checked={isTableEmpty}
                  readOnly
                  style={{ width: 15, height: 15, accentColor: '#AD4928' }}
                />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: isTableEmpty ? '#166534' : '#9a3412' }}>
                    {isTableEmpty ? "Table is Empty" : "Table is Still Occupied"}
                  </p>
                  <p style={{ fontSize: 10, color: isTableEmpty ? '#15803d' : '#c2410c', opacity: 0.8 }}>
                    {isTableEmpty ? "Mark as Free" : "Keep as Occupied"}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
              <button
                onClick={() => setPaymentModalOrder(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f3f4f6", color: "#4b5563", border: "none", fontWeight: "bold", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingPayment}
                onClick={async () => {
                  setIsSubmittingPayment(true);
                  try {
                    const finalTotal = paymentModalOrder.total - (parseFloat(discountAmount) || 0);
                    const paid = cashReceived === "" ? finalTotal : Number(cashReceived);
                    const balanceDue = Math.max(0, finalTotal - paid);
                    const isKhata = balanceDue > 0;

                    if (isKhata) {
                      // Record as partial/unpaid Khata entry for each order
                      const orders = paymentModalOrder.orders || [paymentModalOrder];
                      for (const order of orders) {
                        const orderBalance = Math.round((order.total / paymentModalOrder.total) * balanceDue);
                        const orderPaid = order.total - orderBalance;
                        await recordKhataPayment({
                          orderId: order.id,
                          orderTotal: order.total,
                          cashReceived: Math.max(0, orderPaid),
                          customerName: customerName || paymentModalOrder.customer || "Guest",
                          customerPhone,
                          tableNum: paymentModalOrder.tableId || paymentModalOrder.table,
                          adminEmail: import.meta.env.VITE_ADMIN_EMAIL || "Admin",
                        });
                      }
                    } else {
                      // Full payment — normal flow
                      const paymentData = { paymentMethod, paymentNote, discountAmount: parseFloat(discountAmount) || 0 };
                      if (paymentModalOrder.orders) {
                        const orderIds = paymentModalOrder.orders.map(o => o.id);
                        await bulkCompleteTable(orderIds, paymentData);
                      } else {
                        await updateOrderPaymentAndStatus(paymentModalOrder.id, "Completed", paymentMethod, paymentNote, discountAmount);
                      }
                    }

                    // Update table occupancy
                    const finalTableId = paymentModalOrder.table || paymentModalOrder.tableId;
                    await updateTableOccupancy(finalTableId, !isTableEmpty);

                    // Reset state
                    setCashReceived("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setPaymentModalOrder(null);
                  } catch (err) {
                    console.error("Failed to complete table payment:", err);
                    alert("Failed to complete payment.");
                  } finally {
                    setIsSubmittingPayment(false);
                  }
                }}
                style={{ flex: 2, padding: "12px", borderRadius: 12, background: "#AD4928", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer", opacity: isSubmittingPayment ? 0.7 : 1 }}
              >
                {isSubmittingPayment ? "Processing..." : (
                  cashReceived !== "" && Number(cashReceived) < (paymentModalOrder.total - (parseFloat(discountAmount) || 0))
                    ? `Record Khata · Due Rs. ${(paymentModalOrder.total - (parseFloat(discountAmount) || 0) - Number(cashReceived)).toFixed(0)}`
                    : `Complete & Pay Rs. ${paymentModalOrder.total - (parseFloat(discountAmount) || 0)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Styles for new order pulse */}
      <style>{`
        @keyframes pulse-green {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
