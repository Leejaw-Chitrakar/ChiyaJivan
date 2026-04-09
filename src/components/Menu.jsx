import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Menu.css';

const categories = {
  Classic: [
    { 
      id: 'c1', 
      name: 'Masala Chiya', 
      desc: 'Slow-simmered in whole milk with fresh ginger & secret mountain spices.', 
      price: '80', 
      tag: 'Bestseller',
      img: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'c2', 
      name: 'Ginger Honey', 
      desc: 'Fresh-pressed ginger and wild mountain honey with Ilam black tea.', 
      price: '90', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1594910041794-d2eab3a38cd1?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'c3', 
      name: 'Tulsi Lemon', 
      desc: 'Holy basil steeped with sun-dried lemon peel and black pepper.', 
      price: '85', 
      tag: 'Vibrant',
      img: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'c4', 
      name: 'Plain Dudh Chiya', 
      desc: 'Full-fat buffalo milk, Darjeeling second flush — simple, perfect.', 
      price: '70', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1556742526-7e47a9ef3878?w=400&h=400&fit=crop&q=80'
    },
  ],
  Specialty: [
    { 
      id: 's1', 
      name: 'Kesar Dudh Chiya', 
      desc: 'Saffron milk tea with rose water, served over hand-chipped ice.', 
      price: '160', 
      tag: 'Signature',
      img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 's2', 
      name: 'Himalayan Matcha', 
      desc: 'Ceremonial matcha whisked into steamed yak milk with pink salt.', 
      price: '180', 
      tag: 'New',
      img: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 's3', 
      name: 'Cardamom Cold Brew', 
      desc: 'Darjeeling FTGFOP cold-brewed 18 hours, cardamom syrup.', 
      price: '150', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1499961024600-ad094db305cc?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 's4', 
      name: 'Kashmiri Pink', 
      desc: 'Noon chai with dried rose petals and crushed pistachios.', 
      price: '170', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1560965383-79d15df9ef68?w=400&h=400&fit=crop&q=80'
    },
  ],
  Snacks: [
    { 
      id: 'sn1', 
      name: 'Sel Roti & Achar', 
      desc: 'Crisp ring-bread of stone-ground rice with tomato achar.', 
      price: '120', 
      tag: 'Traditional',
      img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'sn2', 
      name: 'Khaju Bara', 
      desc: 'Lentil wafers baked thin, fenugreek and black sesame.', 
      price: '100', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'sn3', 
      name: 'Millet Momo', 
      desc: 'Hand-folded dumplings, yak cheese & mushroom filling.', 
      price: '200', 
      tag: "Chef's Pick",
      img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=400&fit=crop&q=80'
    },
    { 
      id: 'sn4', 
      name: 'Sikarni Bowl', 
      desc: 'Strained yoghurt, cardamom, saffron, crushed walnut.', 
      price: '130', 
      tag: null,
      img: 'https://images.unsplash.com/photo-1563805042-7684c8e9e5cb?w=400&h=400&fit=crop&q=80'
    },
  ],
};

const TABS = Object.keys(categories);

export default function Menu() {
  const [active, setActive] = useState('Classic');
  const items = categories[active];

  return (
    <section id="menu" className="section-spacing menu-section">
      <div className="page-shell">
        {/* Editorial Header */}
        <div className="menu-header">
          <div className="menu-title-wrapper">
            <p className="menu-eyebrow">The Selection</p>
            <h2 className="menu-title">
              Our <br /> <em className="menu-title-italic">Menu</em>
            </h2>
          </div>
          <div className="menu-desc-wrapper">
            <p className="menu-desc">
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
              className={`menu-tab-btn ${active === tab ? 'active' : ''}`}
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
              <div className="menu-card-img-wrap">
                <img 
                  src={item.img} 
                  alt={item.name} 
                  className="menu-card-img" 
                  loading="lazy"
                />
              </div>
              
              <div className="menu-card-content">
                <div className="menu-card-header">
                  <div className="menu-item-title-wrap">
                    <h3 className="menu-item-title">{item.name}</h3>
                    {item.tag && (
                      <span className="menu-item-tag">{item.tag}</span>
                    )}
                  </div>
                  <span className="menu-item-price">Rs. {item.price}</span>
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
          <Link to="/social" className="menu-cta-link">
            See our daily story
          </Link>
        </div>
      </div>
    </section>
  );
}
