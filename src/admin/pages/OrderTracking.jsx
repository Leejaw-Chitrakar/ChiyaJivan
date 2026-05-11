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
  updateOrderPaymentAndStatus,
  bulkCompleteTable,
  updateTableOccupancy,
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

  // Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isTableEmpty, setIsTableEmpty] = useState(true);

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
    if (order.status !== "Completed") acc[tableId].hasLiveOrders = true;

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
    
    return tableList.filter(t => t.orders.some(o => o.status === activeFilter));
  })();

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

                <div className="order-card-action-section" style={{ borderTop: "1px dashed #e5e7eb", paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex flex-col gap-1">
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>Table Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const statuses = table.orders.map(o => o.status);
                        let displayStatus = "Completed";
                        if (statuses.includes("Pending")) displayStatus = "Pending";
                        else if (statuses.includes("Preparing")) displayStatus = "Preparing";
                        else if (statuses.includes("Served")) displayStatus = "Served";
                        
                        return (
                          <span className={`order-card-badge ${displayStatus}`} style={{ margin: 0, padding: '4px 10px', fontSize: '10px' }}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Single Bulk Action Button */}
                  {(() => {
                    const statuses = table.orders.map(o => o.status);
                    
                    // If everything is completed, don't show any action button
                    if (statuses.every(s => s === "Completed")) return null;

                    let primaryStatus = "Served";
                    if (statuses.includes("Pending")) primaryStatus = "Pending";
                    else if (statuses.includes("Preparing")) primaryStatus = "Preparing";

                    const cfg = STATUS[primaryStatus];
                    if (!cfg.next) return null;

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
                  style={{ fontSize: 8, letterSpacing: "0.2em", opacity: 0.6 }}
                >
                  Order Details
                </p>
                <h3
                  className="font-bold"
                  style={{ fontSize: 16, marginTop: 2 }}
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
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
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
                    style={{ fontSize: 13, color: "#3d2b1f" }}
                  >
                    {selectedOrder.customer && selectedOrder.customer !== selectedOrder.tableName ? selectedOrder.customer : "Anonymous"}
                  </p>
                </div>
                <div className="text-right">
                   <p className="font-bold uppercase" style={{ fontSize: 9, color: "#9ca3af", letterSpacing: "0.15em", marginBottom: 2 }}>Orders</p>
                   <p className="font-bold" style={{ fontSize: 13, color: "#AD4928" }}>{selectedOrder.orders?.length || 1}</p>
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
                        padding: "6px 10px",
                        background: "#fdfbf7",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <p
                          className="font-bold"
                          style={{ fontSize: 12, color: "#3d2b1f" }}
                        >
                          {item.name}
                        </p>
                        <p style={{ fontSize: 10, color: "#9ca3af" }}>
                          Qty: {item.qty}
                        </p>
                      </div>
                      <p
                        className="font-bold"
                        style={{ fontSize: 12, color: "#AD4928" }}
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
            <div style={{ padding: "24px 28px", background: "#fdfbf7", borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold" style={{ fontSize: 20, color: "#3d2b1f" }}>Confirm Payment</h3>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Complete order for {paymentModalOrder.tableName || `Table ${paymentModalOrder.table || paymentModalOrder.tableId}`}
              </p>
            </div>
            
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p className="font-bold" style={{ fontSize: 13, color: "#3d2b1f", marginBottom: 8 }}>Payment Method</p>
                <div style={{ display: "flex", gap: 10 }}>
                  {["Cash", "Online"].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 12,
                        border: `2px solid ${paymentMethod === method ? "#AD4928" : "#e5e7eb"}`,
                        background: paymentMethod === method ? "#fdf2ed" : "#fff",
                        color: paymentMethod === method ? "#AD4928" : "#6b7280",
                        fontWeight: "bold",
                        fontSize: 14,
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
                <p className="font-bold" style={{ fontSize: 13, color: "#3d2b1f", marginBottom: 8 }}>Note (Optional)</p>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Needs exact change, paid via eSewa, tip included..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontSize: 14,
                    minHeight: 80,
                    resize: "none"
                  }}
                />
              </div>

              <div>
                <p className="font-bold" style={{ fontSize: 13, color: "#3d2b1f", marginBottom: 8 }}>Discount Given (Rs.)</p>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Table Empty Toggle */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  padding: '12px 16px', 
                  background: isTableEmpty ? '#f0fdf4' : '#fff7ed', 
                  borderRadius: 12,
                  border: `1px solid ${isTableEmpty ? '#bcf0da' : '#ffedd5'}`,
                  cursor: 'pointer'
                }}
                onClick={() => setIsTableEmpty(!isTableEmpty)}
              >
                <input 
                  type="checkbox" 
                  checked={isTableEmpty} 
                  readOnly
                  style={{ width: 18, height: 18, accentColor: '#AD4928' }} 
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: isTableEmpty ? '#166534' : '#9a3412' }}>
                    {isTableEmpty ? "Table is Empty" : "Table is Still Occupied"}
                  </p>
                  <p style={{ fontSize: 11, color: isTableEmpty ? '#15803d' : '#c2410c', opacity: 0.8 }}>
                    {isTableEmpty ? "Mark as Free on Floor Map" : "Keep as Occupied on Floor Map"}
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ padding: "16px 28px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
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
                    const paymentData = { 
                      paymentMethod, 
                      paymentNote, 
                      discountAmount: parseFloat(discountAmount) || 0 
                    };

                    if (paymentModalOrder.orders) {
                      const orderIds = paymentModalOrder.orders.map(o => o.id);
                      await bulkCompleteTable(orderIds, paymentData);
                    } else {
                      await updateOrderPaymentAndStatus(paymentModalOrder.id, "Completed", paymentMethod, paymentNote, discountAmount);
                    }
                    
                    // Update table occupancy status
                    const finalTableId = paymentModalOrder.table || paymentModalOrder.tableId;
                    await updateTableOccupancy(finalTableId, !isTableEmpty);
                    
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
                {isSubmittingPayment ? "Completing..." : `Complete & Pay Rs. ${paymentModalOrder.total - (parseFloat(discountAmount) || 0)}`}
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
