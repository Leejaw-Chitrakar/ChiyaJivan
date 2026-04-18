import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  X,
  Loader2
} from 'lucide-react';
import { getMenuItems, toggleMenuItemStock, deleteMenuItem } from '../../lib/firestoreService';
import '../styles/MenuManager.css';

// Fallback seed data (used if Firestore is empty)
const SEED_MENU = {
  'Hot Favorites': [
    { id: 'h1', name: 'Milk Tea', price: '35', stock: true, category: 'Hot Favorites', desc: 'Our signature blend of CTC tea and creamy milk.' },
    { id: 'h2', name: 'Milk Masala Tea', price: '45', stock: true, category: 'Hot Favorites', desc: 'Spiced milk tea with fresh ginger and secret mountain spices.' },
    { id: 'h3', name: 'Black Masala Tea', price: '25', stock: true, category: 'Hot Favorites', desc: 'Invigorating black tea with aromatic spices.' },
    { id: 'h4', name: 'Hot Lemon Honey Ginger', price: '100', stock: true, category: 'Hot Favorites', desc: 'Wellness brew — zesty lemon, ginger, and honey.' },
    { id: 'h5', name: 'Hot Chocolate', price: '160', stock: true, category: 'Hot Favorites', desc: 'Velvety, rich chocolate with a dusting of cocoa.' },
  ],
  'Cold Drinks': [
    { id: 'c1', name: 'Mixed Lassi', price: '150', stock: true, category: 'Cold Drinks', desc: 'Thick, creamy yogurt lassi with seasonal fruits.' },
    { id: 'c2', name: 'KitKat Milkshake', price: '225', stock: false, category: 'Cold Drinks', desc: 'Vanilla blend with crunchy KitKat and chocolate.' },
    { id: 'c3', name: 'Classic Mojito', price: '150', stock: true, category: 'Cold Drinks', desc: 'Fresh mint, lime, and sparkling soda.' },
    { id: 'c4', name: 'Blue Lagoon', price: '140', stock: true, category: 'Cold Drinks', desc: 'Vibrant citrus punch with a hint of blue Curacao.' },
    { id: 'c5', name: 'Mocha Milkshake', price: '250', stock: true, category: 'Cold Drinks', desc: 'Blending rich chocolate and bold espresso notes.' },
  ],
  'Momo & Food': [
    { id: 'm1', name: 'Buff Momo', price: '120 / 130', stock: true, category: 'Momo & Food', desc: 'Hand-folded dumplings filled with lean buffalo meat.' },
    { id: 'm2', name: 'Chicken Momo', price: '150 / 160', stock: true, category: 'Momo & Food', desc: 'Succulent chicken filling in a delicate wrapper.' },
    { id: 'm3', name: 'Veg Momo', price: '100 / 120', stock: true, category: 'Momo & Food', desc: 'Filled with fresh garden greens and local spices.' },
    { id: 'm4', name: 'Buff Chilly', price: '180', stock: true, category: 'Momo & Food', desc: 'Wok-tossed bison chunks with spicy peppers.' },
    { id: 'm5', name: 'Chicken Wings', price: '350', stock: true, category: 'Momo & Food', desc: 'Crispy wings tossed in our signature Himalayan-glaze sauce.' },
    { id: 'm6', name: 'Sandwich (Veg/Chicken)', price: '160 / 200', stock: true, category: 'Momo & Food', desc: 'Freshly toasted with your choice of filling.' },
    { id: 'm7', name: 'Sausages (Stick)', price: '40 / 50', stock: true, category: 'Momo & Food', desc: 'Grilled to perfection. Choice of Buff or Chicken.' },
  ]
};

/** Group a flat array of items by category */
function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
}

const CATEGORY_COLORS = {
  'Hot Favorites': { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'Cold Drinks':   { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  'Momo & Food':   { dot: 'bg-[#AD4928]',  bg: 'bg-[#AD4928]/5', text: 'text-[#AD4928]', border: 'border-[#AD4928]/10' },
};

export default function MenuManager() {
  const [menu, setMenu] = useState(SEED_MENU);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Load from Firestore on mount
  useEffect(() => {
    getMenuItems()
      .then((items) => {
        if (items.length > 0) {
          setMenu(groupByCategory(items));
        }
        // else keep SEED_MENU as fallback
      })
      .catch((err) => console.error('Firestore load error:', err))
      .finally(() => setLoading(false));
  }, []);


  const categories = ['All', ...Object.keys(menu)];

  const totalItems = Object.values(menu).flat().length;
  const outOfStock = Object.values(menu).flat().filter(i => !i.stock).length;

  const toggleStock = async (category, id) => {
    const item = menu[category]?.find(i => i.id === id);
    if (!item) return;
    // Optimistic UI update
    setMenu(prev => {
      const updated = prev[category].map(i => i.id === id ? { ...i, stock: !i.stock } : i);
      return { ...prev, [category]: updated };
    });
    // Persist to Firestore
    try {
      await toggleMenuItemStock(id, item.stock);
    } catch (err) {
      console.error('Failed to update Firestore:', err);
      // Revert on error
      setMenu(prev => {
        const reverted = prev[category].map(i => i.id === id ? { ...i, stock: item.stock } : i);
        return { ...prev, [category]: reverted };
      });
    }
  };

  const deleteItem = async (category, id) => {
    if (!window.confirm('Remove this item from the menu?')) return;
    // Optimistic UI update
    setMenu(prev => {
      const updated = prev[category].filter(item => item.id !== id);
      return { ...prev, [category]: updated };
    });
    // Persist to Firestore
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.error('Failed to delete from Firestore:', err);
    }
  };


  const filteredMenu = () => {
    const result = {};
    Object.keys(menu).forEach(cat => {
      if (activeCategory === 'All' || activeCategory === cat) {
        const items = menu[cat].filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (items.length > 0) result[cat] = items;
      }
    });
    return result;
  };

  const displayItems = filteredMenu();

  return (
    <div className="menu-manager-container">
      {/* Page Header */}
      <div className="menu-manager-header">
        <div>
          <p className="menu-manager-eyebrow">Chiya Jivan — Admin</p>
          <h1 className="menu-manager-title">Menu Management</h1>
          <p className="menu-manager-subtitle">Manage your offerings, availability, and pricing in real time.</p>
        </div>
        <button className="menu-manager-add-btn">
          <Plus size={18} strokeWidth={2.5} /> Add New Item
        </button>
      </div>

      {/* Summary Strip */}
      <div className="menu-summary-grid">
        {[
          { label: 'Total Items', value: totalItems, type: 'total' },
          { label: 'Available', value: totalItems - outOfStock, type: 'available' },
          { label: 'Out of Stock', value: outOfStock, type: 'out' },
        ].map(s => (
          <div key={s.label} className={`menu-summary-card ${s.type}`}>
            <p className={`menu-summary-val ${s.type}`}>{s.value}</p>
            <p className="menu-summary-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Category Filter */}
      <div className="menu-search-strip">
        <div className="menu-search-input-wrap">
          <Search className="menu-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search items..."
            className="menu-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="menu-search-clear">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="menu-cat-filters">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`menu-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        {Object.keys(displayItems).length > 0 ? (
          Object.keys(displayItems).map(category => {
            const colors = CATEGORY_COLORS[category] || { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100' };
            return (
              <div key={category} style={{ marginTop: '2.5rem' }}>
                {/* Category Label */}
                <div className="menu-cat-header">
                  <div className={`menu-cat-label ${colors.bg} ${colors.border}`}>
                    <span className={`menu-cat-dot ${colors.dot}`} />
                    <span className={`menu-cat-name ${colors.text}`}>{category}</span>
                  </div>
                  <div className="menu-cat-line" />
                  <span className="menu-cat-count">{displayItems[category].length} items</span>
                </div>

                <div className="menu-item-grid">
                  {displayItems[category].map(item => (
                    <div
                      key={item.id}
                      className={`menu-item-card ${!item.stock ? 'disabled' : ''}`}
                    >
                      <div className="menu-item-content">
                        <div className="menu-item-top">
                          <div className="menu-item-title-wrap">
                            <h3 className={`menu-item-title ${!item.stock ? 'strike' : ''}`}>
                              {item.name}
                            </h3>
                            <div className="menu-item-price-wrap">
                              <Tag size={12} className="text-[#AD4928]" />
                              <span className="menu-item-price">Rs. {item.price}</span>
                            </div>
                          </div>
                          <div className="menu-item-actions">
                            <button className="menu-item-action-btn">
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteItem(category, item.id)}
                              className="menu-item-action-btn danger"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <p className="menu-item-desc">{item.desc}</p>
                      </div>

                      <div className="menu-item-footer">
                        <span className={`menu-item-status ${item.stock ? 'avail' : 'out'}`}>
                          {item.stock ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          {item.stock ? 'Available' : 'Out of Stock'}
                        </span>
                        <button
                          onClick={() => toggleStock(category, item.id)}
                          className={`menu-item-toggle ${item.stock ? 'avail' : 'out'}`}
                        >
                          <div className="menu-item-toggle-dot" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="menu-empty-state">
            <div className="menu-empty-icon">
              <Search size={40} />
            </div>
            <div>
              <h3 className="menu-empty-title">No items found</h3>
              <p className="menu-empty-desc">Try a different search or category.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

