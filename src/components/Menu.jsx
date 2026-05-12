import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToShopSettings, subscribeToMenuItems } from "../lib/firestoreService";
import "../styles/Menu.css";

const CATEGORY_ORDER = ["Hot Drinks", "Cold Drinks", "Food", "Smoke", "Bakery & Desserts"];

const groupByCategory = (items) => {
  return items.reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
};

export default function Menu() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Hot Drinks");
  const [categories, setCategories] = useState({});
  const [showPrompt, setShowPrompt] = useState(false);
  const [tableNum, setTableNum] = useState("");
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [tableCount, setTableCount] = useState(10);
  const [tableNames, setTableNames] = useState({});

  useEffect(() => {
    // 1. Subscribe to shop settings
    const unsubSettings = subscribeToShopSettings((settings) => {
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

    // 2. Subscribe to menu items
    const unsubMenu = subscribeToMenuItems((items) => {
      if (items && items.length > 0) {
        const dbMenu = groupByCategory(items);
        setCategories(dbMenu);
      } else {
        setCategories({});
      }
    });

    return () => {
      unsubSettings();
      unsubMenu();
    };
  }, []);

  const visibleCategories = Object.keys(categories).reduce((acc, cat) => {
    const itemsInCat = categories[cat] || [];
    const hasStock = itemsInCat.some(item => item.stock !== false);
    if (hasStock) acc[cat] = itemsInCat;
    return acc;
  }, {});

  const visibleTabs = Object.keys(visibleCategories).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(active)) {
      setActive(visibleTabs[0]);
    }
  }, [visibleTabs, active]);

  const tableOptions = Array.from({ length: tableCount }, (_, i) => i + 1);
  const items = visibleCategories[active] || [];

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
              <div className="menu-modal-grid">
                {tableOptions.map((num) => {
                  const val = num.toString();
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTableNum(val)}
                      className={`menu-modal-grid-btn ${tableNum === val ? "active" : ""}`}
                    >
                      {tableNames[num.toString()] || tableNames[num] || `Table ${num}`}
                    </button>
                  );
                })}
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
          {visibleTabs.map((tab) => (
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
          {(visibleCategories[active] || [])
            .filter((item) => item.stock !== false)
            .map((item) => (
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
            Available for Dine-in & Takeaway &nbsp;·&nbsp; Bhaktapur, Golmadhi
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
