import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import "../styles/OrderPage.css";

// Same menu data as the main Menu component
const categories = {
  "Hot Favorites": [
    {
      id: "h1",
      name: "Milk Tea",
      desc: "Our signature blend of CTC tea and creamy milk, brewed to perfection.",
      price: 35,
      tag: "Local Favorite",
    },
    {
      id: "h2",
      name: "Milk Masala Tea",
      desc: "Spiced milk tea brewed with fresh ginger and secret mountain spices.",
      price: 45,
      tag: "Bestseller",
    },
    {
      id: "h3",
      name: "Black Masala Tea",
      desc: "Invigorating black tea infused with a house blend of aromatic spices.",
      price: 25,
      tag: null,
    },
    {
      id: "h4",
      name: "Hot Lemon Honey Ginger",
      desc: "The ultimate wellness brew — zesty lemon, sharp ginger, and wild mountain honey.",
      price: 100,
      tag: "Wellness",
    },
    {
      id: "h5",
      name: "Hot Chocolate",
      desc: "Velvety, rich chocolate served steaming hot with a dusting of cocoa.",
      price: 160,
      tag: "Indulgent",
    },
    {
      id: "h6",
      name: "Milk Coffee",
      desc: "Smooth and creamy café-style milk coffee.",
      price: 60,
      tag: null,
    },
  ],
  "Cold Drinks": [
    {
      id: "c1",
      name: "Mixed Lassi",
      desc: "Thick, creamy yogurt lassi blended with seasonal fruits.",
      price: 150,
      tag: "Traditional",
    },
    {
      id: "c2",
      name: "KitKat Milkshake",
      desc: "Creamy vanilla blend mixed with crunchy KitKat and chocolate swirl.",
      price: 225,
      tag: "Popular",
    },
    {
      id: "c3",
      name: "Classic Mojito",
      desc: "Fresh mint, lime, and sparkling soda — a crisp, timeless cooler.",
      price: 150,
      tag: null,
    },
    {
      id: "c4",
      name: "Blue Lagoon",
      desc: "A vibrant citrus punch with a hint of blue Curacao.",
      price: 140,
      tag: null,
    },
    {
      id: "c5",
      name: "Mocha Milkshake",
      desc: "The perfect indulgence blending rich chocolate and bold espresso notes.",
      price: 250,
      tag: "Premium",
    },
    {
      id: "c6",
      name: "Masala Soda",
      desc: "Your choice of Coke or Sprite with a zingy Himalayan spice twist.",
      price: 90,
      tag: "Zesty",
    },
  ],
  "Momo & Food": [
    {
      id: "m1",
      name: "Buff Momo (Steam)",
      desc: "Hand-folded dumplings filled with lean buffalo meat.",
      price: 120,
      tag: "Bestseller",
    },
    {
      id: "m1f",
      name: "Buff Momo (Fry)",
      desc: "Golden fried dumplings filled with lean buffalo meat.",
      price: 130,
      tag: null,
    },
    {
      id: "m2",
      name: "Chicken Momo (Steam)",
      desc: "Succulent chicken filling in a delicate wrapper.",
      price: 150,
      tag: "Recommended",
    },
    {
      id: "m2f",
      name: "Chicken Momo (Fry)",
      desc: "Crispy fried chicken dumplings.",
      price: 160,
      tag: null,
    },
    {
      id: "m3",
      name: "Veg Momo (Steam)",
      desc: "Filled with fresh garden greens and local spices.",
      price: 100,
      tag: null,
    },
    {
      id: "m3f",
      name: "Veg Momo (Fry)",
      desc: "Crispy fried vegetable dumplings.",
      price: 120,
      tag: null,
    },
    {
      id: "m4",
      name: "Buff Chilly",
      desc: "Wok-tossed bison chunks with bell peppers, onions, and hot spices.",
      price: 180,
      tag: "Spicy",
    },
    {
      id: "m5",
      name: "Chicken Wings",
      desc: "Crispy wings tossed in our signature Himalayan-glaze sauce.",
      price: 350,
      tag: "Must Try",
    },
    {
      id: "m6v",
      name: "Sandwich (Veg)",
      desc: "Freshly prepared and toasted with veg filling.",
      price: 160,
      tag: null,
    },
    {
      id: "m6c",
      name: "Sandwich (Chicken)",
      desc: "Freshly prepared and toasted with chicken filling.",
      price: 200,
      tag: null,
    },
    {
      id: "m7",
      name: "French Fries",
      desc: "Golden-crisp potatoes seasoned with sea salt.",
      price: 120,
      tag: null,
    },
    {
      id: "m8b",
      name: "Sausages - Buff",
      desc: "Grilled to perfection on a stick.",
      price: 40,
      tag: null,
    },
    {
      id: "m8c",
      name: "Sausages - Chicken",
      desc: "Grilled to perfection on a stick.",
      price: 50,
      tag: null,
    },
  ],
};

const TABS = Object.keys(categories);

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("table") || "?";
  const [activeTab, setActiveTab] = useState("Hot Favorites");
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  const items = categories[activeTab];

  const addToCart = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        ...item,
        qty: (prev[item.id]?.qty || 0) + 1,
      },
    }));
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId].qty <= 1) {
        delete updated[itemId];
      } else {
        updated[itemId] = { ...updated[itemId], qty: updated[itemId].qty - 1 };
      }
      return updated;
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);

    try {
      const orderData = {
        table: tableNumber,
        customer: customerName.trim() || `Table ${tableNumber}`,
        items: cartItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        itemsSummary: cartItems.map((i) => `${i.name} (${i.qty}x)`).join(", "),
        total: cartTotal,
        status: "Pending",
        type: "Dine-in",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);
      setOrderId(docRef.id.slice(-6).toUpperCase());
      setLastOrder({ items: cartItems, total: cartTotal });
      setOrderPlaced(true);
      setCart({});
      setCustomerName("");
    } catch (err) {
      console.error("Order failed:", err);
      alert("Something went wrong placing your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Order success screen
  if (orderPlaced && lastOrder) {
    return (
      <div className="order-page">
        <div className="order-success">
          <div className="order-success-card">
            <div className="order-success-icon">✅</div>
            <h1 className="order-success-title">Order Placed!</h1>
            <p className="order-success-subtitle">
              Your order has been sent to the kitchen
            </p>
            <div className="order-success-details">
              <div className="order-success-row">
                <span>Order ID</span>
                <strong>#{orderId}</strong>
              </div>
              <div className="order-success-row">
                <span>Table</span>
                <strong>{tableNumber}</strong>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f3f4f6",
                  textAlign: "left",
                }}
              >
                <strong
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    letterSpacing: "0.05em",
                  }}
                >
                  Items Ordered
                </strong>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  {lastOrder.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        color: "#6b7280",
                      }}
                    >
                      <span>
                        {item.qty} × {item.name}
                      </span>
                      <span>Rs. {item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="order-success-row"
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                <span>Total</span>
                <strong>Rs. {lastOrder.total}</strong>
              </div>
            </div>
            <p className="order-success-note">
              Please wait at your table. Your order will be served shortly. 🍵
            </p>
            <button
              className="order-success-btn"
              onClick={() => {
                setOrderPlaced(false);
                setOrderId("");
                setLastOrder(null);
              }}
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="order-page"
      style={cartCount > 0 ? { paddingBottom: 420 } : undefined}
    >
      {/* Top Bar */}
      <header className="order-header">
        <div
          className="order-header-inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div className="order-header-brand">
            <span className="order-header-logo">☕</span>
            <div>
              <h1 className="order-header-title">Chiya Jivan</h1>
              <p className="order-header-subtitle">Table {tableNumber}</p>
            </div>
          </div>
          <Link
            to="/menu"
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#AD4928",
              textDecoration: "none",
              padding: "8px 16px",
              background: "#Fdf2ed",
              borderRadius: "999px",
              transition: "all 0.2s",
            }}
          >
            ← Menu
          </Link>
        </div>
      </header>

      {/* Welcome */}
      <div className="order-welcome">
        <p className="order-welcome-eyebrow">Welcome to your table</p>
        <h2 className="order-welcome-title">
          What would you like <br />
          to <em>order</em> today?
        </h2>
      </div>

      {/* Tab Nav */}
      <div className="order-tabs-wrap">
        <div className="order-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`order-tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="order-menu">
        {items.map((item) => {
          const inCart = cart[item.id];
          return (
            <div key={item.id} className="order-item">
              <div className="order-item-info">
                <div className="order-item-top">
                  <h3 className="order-item-name">{item.name}</h3>
                  {item.tag && (
                    <span className="order-item-tag">{item.tag}</span>
                  )}
                </div>
                <p className="order-item-desc">{item.desc}</p>
                <p className="order-item-price">Rs. {item.price}</p>
              </div>
              <div className="order-item-action">
                {inCart ? (
                  <div className="order-item-qty">
                    <button
                      className="order-qty-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      −
                    </button>
                    <span className="order-qty-count">{inCart.qty}</span>
                    <button
                      className="order-qty-btn"
                      onClick={() => addToCart(item)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="order-add-btn"
                    onClick={() => addToCart(item)}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart / Checkout (sticky bottom) */}
      {cartCount > 0 && (
        <div className="order-cart-bar">
          <div className="order-cart-inner">
            {/* Customer Name */}
            <div className="order-cart-name-wrap">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="order-cart-name-input"
              />
            </div>

            {/* Cart Summary */}
            <div className="order-cart-summary">
              <div className="order-cart-items-list">
                {cartItems.map((ci) => (
                  <div key={ci.id} className="order-cart-line">
                    <span>
                      {ci.name} × {ci.qty}
                    </span>
                    <span>Rs. {ci.price * ci.qty}</span>
                  </div>
                ))}
              </div>
              <div className="order-cart-total-row">
                <span>Total</span>
                <span>Rs. {cartTotal}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="order-clear-btn"
                onClick={() => setCart({})}
                type="button"
              >
                Clear
              </button>
              <button
                className="order-submit-btn"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Placing Order..."
                ) : (
                  <>
                    Place Order · Rs. {cartTotal}
                    <span className="order-submit-badge">{cartCount}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
