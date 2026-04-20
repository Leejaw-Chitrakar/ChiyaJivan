import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToShopSettings } from "../lib/firestoreService";
import "../styles/Menu.css";

const categories = {
  "Hot Favorites": [
    {
      id: "h1",
      name: "Milk Tea",
      desc: "Our signature blend of CTC tea and creamy milk, brewed to perfection.",
      price: "35",
      tag: "Local Favorite",
    },
    {
      id: "h2",
      name: "Milk Masala Tea",
      desc: "Spiced milk tea brewed with fresh ginger and secret mountain spices.",
      price: "45",
      tag: "Bestseller",
    },
    {
      id: "h3",
      name: "Black Masala Tea",
      desc: "Invigorating black tea infused with a house blend of aromatic spices.",
      price: "25",
      tag: null,
    },
    {
      id: "h4",
      name: "Hot Lemon Honey Ginger",
      desc: "The ultimate wellness brew — zesty lemon, sharp ginger, and wild mountain honey.",
      price: "100",
      tag: "Wellness",
    },
    {
      id: "h5",
      name: "Hot Chocolate",
      desc: "Velvety, rich chocolate served steaming hot with a dusting of cocoa.",
      price: "160",
      tag: "Indulgent",
    },
    {
      id: "h6",
      name: "Milk Coffee",
      desc: "Smooth and creamy café-style milk coffee.",
      price: "60",
      tag: null,
    },
  ],
  "Cold Drinks": [
    {
      id: "c1",
      name: "Mixed Lassi",
      desc: "Thick, creamy yogurt lassi blended with seasonal fruits (Mango/Banana).",
      price: "150",
      tag: "Traditional",
    },
    {
      id: "c2",
      name: "KitKat Milkshake",
      desc: "Creamy vanilla blend mixed with crunchy KitKat and chocolate swirl.",
      price: "225",
      tag: "Popular",
    },
    {
      id: "c3",
      name: "Classic Mojito",
      desc: "Fresh mint, lime, and sparkling soda — a crisp, timeless cooler.",
      price: "150",
      tag: null,
    },
    {
      id: "c4",
      name: "Blue Lagoon",
      desc: "A vibrant citrus punch with a hint of blue Curacao.",
      price: "140",
      tag: null,
    },
    {
      id: "c5",
      name: "Mocha Milkshake",
      desc: "The perfect indulgence blending rich chocolate and bold espresso notes.",
      price: "250",
      tag: "Premium",
    },
    {
      id: "c6",
      name: "Masala Soda",
      desc: "Your choice of Coke or Sprite with a zingy Himalayan spice twist.",
      price: "90",
      tag: "Zesty",
    },
  ],
  Food: [
    {
      id: "m1",
      name: "Buff Momo",
      desc: "Hand-folded dumplings filled with lean buffalo meat. Choice of Steam/Fry.",
      price: "120 / 130",
      tag: "Bestseller",
    },
    {
      id: "m2",
      name: "Chicken Momo",
      desc: "Succulent chicken filling in a delicate wrapper. Choice of Steam/Fry.",
      price: "150 / 160",
      tag: "Recommended",
    },
    {
      id: "m3",
      name: "Veg Momo",
      desc: "Filled with fresh garden greens and local spices. Choice of Steam/Fry.",
      price: "100 / 120",
      tag: null,
    },
    {
      id: "m4",
      name: "Buff Chilly",
      desc: "Wok-tossed bison chunks with bell peppers, onions, and hot spices.",
      price: "180",
      tag: "Spicy",
    },
    {
      id: "m5",
      name: "Chicken Wings",
      desc: "Crispy wings tossed in our signature Himalayan-glaze sauce.",
      price: "350",
      tag: "Must Try",
    },
    {
      id: "m6",
      name: "Sandwich (Veg/Chicken)",
      desc: "Freshly prepared and toasted. Choice of Veg or Chicken filling.",
      price: "160 / 200",
      tag: "Filling",
    },
    {
      id: "m7",
      name: "French Fries",
      desc: "Golden-crisp potatoes seasoned with sea salt.",
      price: "120",
      tag: null,
    },
    {
      id: "m8",
      name: "Sausages (Stick)",
      desc: "Grilled to perfection. Choice of Buff or Chicken.",
      price: "40 / 50",
      tag: null,
    },
  ],
};

const TABS = Object.keys(categories);

export default function Menu() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Hot Favorites");
  const [showPrompt, setShowPrompt] = useState(false);
  const [tableNum, setTableNum] = useState("");
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [tableCount, setTableCount] = useState(10);
  const [tableNames, setTableNames] = useState({});

  useEffect(() => {
    const unsub = subscribeToShopSettings((settings) => {
      if (settings) {
        if (typeof settings.isShopOpen === "boolean") {
          setIsShopOpen(settings.isShopOpen);
        }
        if (settings.tableCount) {
          setTableCount(parseInt(settings.tableCount) || 10);
        }
        if (settings.tableNames) {
          setTableNames(settings.tableNames);
        }
      }
    });
    return () => unsub();
  }, []);

  const tableOptions = Array.from({ length: tableCount }, (_, i) => i + 1);

  const items = categories[active];

  const handleOrderRedirect = (e) => {
    e.preventDefault();
    if (tableNum) {
      navigate(`/order?table=${encodeURIComponent(tableNum)}`);
    }
  };

  return (
    <section id="menu" className="section-spacing menu-section relative">
      {/* Table Number Prompt Modal */}
      {showPrompt && (
        <div
          className="menu-modal-overlay"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="menu-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="menu-modal-title">Table Number</h3>
            <p className="menu-modal-desc">
              Please select the table you are seated at.
            </p>

            <form onSubmit={handleOrderRedirect} className="menu-modal-form">
              <div className="menu-modal-select-wrapper">
                <select
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value)}
                  className="menu-modal-select"
                  required
                >
                  <option value="" disabled>
                    Select Table...
                  </option>
                  {tableOptions.map((num) => (
                    <option key={num} value={num}>
                      {tableNames[num] || `Table ${num}`}
                    </option>
                  ))}
                </select>
                <div className="menu-modal-select-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>

              <div className="menu-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  className="menu-modal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tableNum}
                  className="menu-modal-btn-submit"
                >
                  Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-shell">
        {/* Editorial Header */}
        <div className="menu-header">
          <div className="menu-title-wrapper flex-1">
            <p className="menu-eyebrow">The Selection</p>
            <h2 className="menu-title">
              Our <br /> <em className="menu-title-italic">Menu</em>
            </h2>
          </div>

          <div className="menu-desc-wrapper flex flex-col items-start md:items-end gap-6 mt-6 md:mt-0">
            <button
              onClick={() => isShopOpen && setShowPrompt(true)}
              className={`menu-order-btn ${!isShopOpen ? "opacity-50 cursor-not-allowed bg-gray-400" : ""}`}
              disabled={!isShopOpen}
            >
              {isShopOpen ? (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Order Now
                </>
              ) : (
                "Currently Closed"
              )}
            </button>
            <p className="menu-desc text-left md:text-right">
              Sourced from the highlands of Ilam — every cup is a quiet
              ceremony, balanced and rooted in tradition.
            </p>
          </div>
        </div>

        {/* Minimal Tab Navigation */}
        <div className="menu-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`menu-tab-btn ${active === tab ? "active" : ""}`}
            >
              {tab}
              {active === tab && <div className="menu-tab-indicator"></div>}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="menu-grid">
          {items.map((item) => (
            <div key={item.id} className="menu-card group">
              <div className="menu-card-content">
                <div className="menu-card-header">
                  <div className="menu-item-title-wrap">
                    <h3 className="menu-item-title">{item.name}</h3>
                    {item.tag && (
                      <span className="menu-item-tag">{item.tag}</span>
                    )}
                  </div>
                  <div className="menu-price-wrap">
                    <span className="menu-item-price-unit">Rs.</span>
                    <span className="menu-item-price-value">{item.price}</span>
                  </div>
                </div>
                <p className="menu-item-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="menu-cta-area">
          <p className="menu-cta-text">
            Available for Dine-in & Takeaway &nbsp;·&nbsp; Thamel, Kathmandu
          </p>
          <div className="flex items-center justify-center gap-6 mt-6">
            <Link to="/social" className="menu-cta-link">
              See our daily story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
