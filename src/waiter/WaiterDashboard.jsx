import { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  CheckCircle2, 
  Timer, 
  PauseCircle, 
  Utensils, 
  Bell, 
  Eye, 
  X,
  CreditCard,
  User,
  Coffee,
  ClipboardList,
  Plus,
  Minus
} from "lucide-react";
import { 
  subscribeToOrders, 
  updateOrderStatus, 
  updateOrderPaymentAndStatus,
  updateTableOccupancy,
  subscribeToShopSettings,
  subscribeToMenuItems 
} from "../lib/firestoreService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import "./WaiterDashboard.css";

const STATUS_CONFIG = {
  Pending: { icon: PauseCircle, label: "Preparing", next: "Preparing", color: "#6b7280" },
  Preparing: { icon: Timer, label: "Serve Now", next: "Served", color: "#d97706" },
  Served: { icon: Utensils, label: "Payment", next: "Completed", color: "#7c3aed" },
};

// Hookha flavors are now pulled dynamically from the menu item's options field
const CATEGORY_ORDER = ["Hot Favorites", "Cold Beverage", "Cold Refreshing", "Milkshake", "Food", "Bakery & Desserts", "Smoke", "Hard Drinks"];

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tableNames, setTableNames] = useState({});
  const [shopSettings, setShopSettings] = useState(null);
  
  // View states
  const [takingOrder, setTakingOrder] = useState(false);
  const [activeTab, setActiveTab] = useState("Hot Favorites");
  const [waiterCart, setWaiterCart] = useState({});
  const [targetTable, setTargetTable] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  // Selection modals
  const [selectedHookha, setSelectedHookha] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  
  const [isLive, setIsLive] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // 1. Subscribe to table names
    const unsubSettings = subscribeToShopSettings((settings) => {
      if (settings) {
        setShopSettings(settings);
        if (settings.tableNames) setTableNames(settings.tableNames);
      }
    });

    // 2. Subscribe to menu
    const unsubMenu = subscribeToMenuItems((items) => {
      setMenuItems(items);
    });

    // 3. Subscribe to live orders
    let lastOrderCount = null;
    const unsubOrders = subscribeToOrders((liveOrders) => {
      const activeOrders = liveOrders.filter(o => o.status !== "Completed" && o.status !== "Cancelled");
      if (lastOrderCount !== null && activeOrders.length > lastOrderCount) {
        if (audioRef.current) audioRef.current.play().catch(console.error);
      }
      lastOrderCount = activeOrders.length;
      setOrders(activeOrders);
      setIsLive(true);
    });

    return () => {
      unsubSettings();
      unsubMenu();
      unsubOrders();
    };
  }, []);

  // --- Order Taking Logic ---
  const addToWaiterCart = (item, flavor = null) => {
    if (item.name.toLowerCase().includes("hookha") && !flavor) {
      setSelectedHookha(item);
      return;
    }

    const key = flavor ? `${item.id}-${flavor}` : item.id;
    const finalName = flavor ? `${item.name} (${flavor})` : item.name;

    setWaiterCart(prev => ({
      ...prev,
      [key]: {
        ...item,
        name: finalName,
        flavor: flavor,
        qty: (prev[key]?.qty || 0) + 1
      }
    }));
    setSelectedHookha(null);
  };

  const removeFromWaiterCart = (key) => {
    setWaiterCart(prev => {
      const updated = { ...prev };
      if (updated[key].qty > 1) {
        updated[key].qty -= 1;
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  const submitWaiterOrder = async () => {
    if (!targetTable) return alert("Select a table first!");
    if (Object.keys(waiterCart).length === 0) return alert("Cart is empty!");

    try {
      const orderTotal = Object.values(waiterCart).reduce((sum, item) => sum + (item.price * item.qty), 0);
      const orderData = {
        table: targetTable,
        customer: customerName || `Table ${targetTable}`,
        items: Object.values(waiterCart).map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          flavor: i.flavor || null
        })),
        total: orderTotal,
        status: "Pending",
        createdAt: serverTimestamp(),
        note: "Added by Waiter"
      };

      await addDoc(collection(db, "orders"), orderData);
      await updateTableOccupancy(targetTable, true);
      
      // Reset
      setWaiterCart({});
      setTakingOrder(false);
      setTargetTable("");
      setCustomerName("");
      alert("Order placed successfully!");
    } catch (err) {
      console.error(err);
      alert("Order failed!");
    }
  };

  const categories = [...new Set(menuItems.map(i => i.category))].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  const cartCount = Object.values(waiterCart).reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = Object.values(waiterCart).reduce((sum, i) => sum + (i.price * i.qty), 0);

  const handleStatusUpdate = async (orderId, nextStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch (err) {
      alert("Error updating status");
    }
  };

  const handlePayment = async (tableId, paymentMethod) => {
    try {
      const tableOrders = orders.filter(o => o.table === tableId);
      const promises = tableOrders.map(o => 
        updateOrderPaymentAndStatus(o.id, "Completed", paymentMethod, "Waiter processed", 0)
      );
      await Promise.all(promises);
      await updateTableOccupancy(tableId, false);
      setPaymentModal(null);
    } catch (err) {
      alert("Payment failed");
    }
  };

  // Group orders by table
  const tableGroups = orders.reduce((acc, order) => {
    const tableId = String(order.table);
    if (!acc[tableId]) {
      acc[tableId] = {
        id: tableId,
        name: tableNames[tableId] || `Table ${tableId}`,
        items: [],
        total: 0,
        customer: order.customer,
        status: "Pending",
        lastUpdate: order.createdAt
      };
    }
    acc[tableId].items.push(...order.items);
    acc[tableId].total += order.total;
    // Determine overall table status
    const statuses = orders.filter(o => String(o.table) === tableId).map(o => o.status);
    if (statuses.includes("Pending")) acc[tableId].status = "Pending";
    else if (statuses.includes("Preparing")) acc[tableId].status = "Preparing";
    else if (statuses.includes("Served")) acc[tableId].status = "Served";

    return acc;
  }, {});

  const sortedTables = Object.values(tableGroups).sort((a, b) => b.lastUpdate?.toDate() - a.lastUpdate?.toDate());

  const getStatusStep = (status) => {
    const steps = ["Pending", "Preparing", "Served"];
    return steps.indexOf(status);
  };
  const timeAgo = (timestamp) => {
    if (!timestamp) return "...";
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className="waiter-container">
      <audio ref={audioRef} src="/bell-chime.mp3" preload="auto" />
      
      <header className="waiter-header">
        <div className="waiter-header-content">
          <div>
            <h1 className="waiter-title">Waiter Dashboard</h1>
            <p className="waiter-status">{isLive ? "● Connected" : "○ Offline"}</p>
          </div>
          <div className="waiter-header-actions">
            <button 
              className={`waiter-btn-action ${takingOrder ? 'cancel' : 'new'}`}
              onClick={() => {
                if (takingOrder) {
                  setWaiterCart({});
                  setTargetTable("");
                  setCustomerName("");
                }
                setTakingOrder(!takingOrder);
              }}
            >
              {takingOrder ? <X size={18} /> : <ClipboardList size={18} />}
              {takingOrder ? "Cancel" : "New Order"}
            </button>
            <Bell className="waiter-bell-icon" onClick={() => audioRef.current.play()} />
          </div>
        </div>
      </header>

      <main className="waiter-main">
        {takingOrder ? (
          <div className="waiter-order-flow">
            {/* Table & Customer Setup */}
            <div className="waiter-setup-card">
              <div className="waiter-setup-grid">
                <div className="waiter-setup-field">
                  <label>Table</label>
                  <select 
                    value={targetTable} 
                    onChange={e => setTargetTable(e.target.value)}
                  >
                    <option value="">Select Table</option>
                    {Array.from({ length: shopSettings?.tableCount || 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num.toString()}>
                        {tableNames[num.toString()] || `Table ${num}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="waiter-setup-field">
                  <label>Customer Name</label>
                  <input 
                    type="text" 
                    placeholder="Optional"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="waiter-tabs">
              {categories.map(cat => (
                <button 
                  key={cat}
                  className={`waiter-tab ${activeTab === cat ? 'active' : ''}`}
                  onClick={() => setActiveTab(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="waiter-menu-grid">
              {menuItems
                .filter(i => i.category === activeTab && i.stock !== false)
                .map(item => {
                  const cartItem = waiterCart[item.id];
                  return (
                    <div key={item.id} className="waiter-menu-item">
                      <div className="waiter-menu-item-info" onClick={() => addToWaiterCart(item)}>
                        <span className="waiter-menu-item-name">{item.name}</span>
                        <span className="waiter-menu-item-price">Rs. {item.price}</span>
                      </div>
                      
                      {cartItem && (
                        <div className="waiter-item-controls">
                          <button 
                            className="waiter-qty-btn minus"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWaiterCart(item.id);
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="waiter-qty-val">{cartItem.qty}</span>
                          <button 
                            className="waiter-qty-btn plus"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToWaiterCart(item);
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      
                      {!cartItem && (
                        <button 
                          className="waiter-item-add-btn"
                          onClick={() => addToWaiterCart(item)}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Cart Summary Bar */}
            {cartCount > 0 && (
              <div className="waiter-cart-bar">
                <div className="waiter-cart-info">
                  <span className="waiter-cart-count">{cartCount} items</span>
                  <span className="waiter-cart-total">Rs. {cartTotal}</span>
                </div>
                <button className="waiter-btn-submit" onClick={submitWaiterOrder}>
                  Place Order
                </button>
              </div>
            )}
          </div>
        ) : sortedTables.length === 0 ? (
          <div className="waiter-empty">
            <Coffee size={48} />
            <h2>No Active Orders</h2>
            <p>Wait for customers to scan and order.</p>
          </div>
        ) : (
          <div className="waiter-grid">
            {sortedTables.map((table) => {
              const currentStep = getStatusStep(table.status);
              const tableOrders = orders.filter(o => o.table === table.id);
              
              return (
                <div key={table.id} className={`waiter-card status-${table.status}`}>
                  <div className="waiter-card-header">
                    <div className="waiter-table-info">
                      <span className="waiter-table-num">{table.name}</span>
                      <span className="waiter-customer">
                        <User size={12} /> {table.customer || "Anonymous"} 
                        <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                        <Clock size={12} /> {timeAgo(table.lastUpdate)}
                      </span>
                    </div>
                    <div className="waiter-status-stepper">
                      {["Pending", "Preparing", "Served"].map((s, i) => (
                        <div key={s} className={`status-step ${i <= currentStep ? 'active' : ''} ${s}`}>
                          <div className="step-dot"></div>
                          <span className="step-label">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="waiter-orders-container">
                    {tableOrders.map((order, idx) => (
                      <div key={order.id} className="waiter-sub-order">
                        <div className="sub-order-header">
                          <span className="sub-order-label">Order #{idx + 1}</span>
                          <span className={`sub-order-status-tag ${order.status}`}>{order.status}</span>
                        </div>
                        <div className="sub-order-items">
                          {order.items.map((item, i) => (
                            <div key={i} className="waiter-item">
                              <span className="waiter-item-qty">{item.qty}x</span>
                              <span className="waiter-item-name">{item.name} {item.flavor ? `(${item.flavor})` : ""}</span>
                            </div>
                          ))}
                        </div>
                        <div className="sub-order-actions">
                          {order.status !== "Completed" && (
                            <button 
                              className={`waiter-btn-small ${order.status}`}
                              onClick={() => handleStatusUpdate(order.id, STATUS_CONFIG[order.status].next)}
                            >
                              {STATUS_CONFIG[order.status].label}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="waiter-footer">
                    <div className="waiter-total">Total: Rs. {table.total}</div>
                    <div className="waiter-actions">
                      {table.status === "Served" && (
                        <button 
                          className="waiter-btn-primary payment"
                          onClick={() => setPaymentModal(table)}
                        >
                          <CreditCard size={16} /> Complete Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Hookha Flavor Modal */}
      {selectedHookha && (
        <div className="waiter-modal-overlay" onClick={() => setSelectedHookha(null)}>
          <div className="waiter-modal" onClick={e => e.stopPropagation()}>
            <h3>Select Flavor</h3>
            <div className="waiter-flavor-grid">
              {(selectedHookha.options || ["Double Apple", "Mint", "Lady Killer", "Blueberry", "Pan Raas", "Watermelon", "Mix Fruit"]).map(f => (
                <button key={f} onClick={() => addToWaiterCart(selectedHookha, f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="waiter-modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="waiter-modal" onClick={e => e.stopPropagation()}>
            <h3>Complete Payment</h3>
            <p>{paymentModal.name} — Total: Rs. {paymentModal.total}</p>
            <div className="waiter-payment-btns">
              <button onClick={() => handlePayment(paymentModal.id, "Cash")}>
                <CreditCard size={18} /> Cash
              </button>
              <button onClick={() => handlePayment(paymentModal.id, "Online")}>
                <CreditCard size={18} /> Online
              </button>
            </div>
            <button className="waiter-btn-close" onClick={() => setPaymentModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
