import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import logo from '../assets/CJ.png';
import '../styles/Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Home', to: '/' },
    { label: 'Menu', to: '/menu' },
    { label: 'Social', to: '/social' },
  ];

  const isLightText = isHome && !scrolled && !menuOpen;

  const getHeaderClass = () => {
    let cls = 'navbar-header ';
    if (scrolled) cls += 'scrolled-header ';
    if (menuOpen) cls += 'menu-open-header ';
    return cls.trim();
  };

  const getNavClass = () => {
    const base = 'page-shell navbar-nav ';
    return base + (scrolled || menuOpen || !isHome ? 'solid-nav' : 'transparent-nav');
  };

  const getHamburgerClass = (position) => {
    if (menuOpen) {
      if (position === 'top') return 'hamburger-line top-open';
      if (position === 'middle') return 'hamburger-line middle-open';
      if (position === 'bottom') return 'hamburger-line bottom-open';
    }
    return `hamburger-line ${isLightText ? 'light-line' : 'dark-line'}`;
  };

  return (
    <header className={getHeaderClass()}>
      <nav className={getNavClass()}>
        {/* Logo Section */}
        <Link
          to="/"
          className="nav-logo-link"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src={logo}
            alt="Chiya Jivan"
            className={`nav-img ${isLightText ? 'invert-logo' : ''}`}
          />
          <span className={`nav-brand ${isLightText ? 'light-text' : 'dark-text'}`}>
            Chiya Jivan
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="desktop-menu">
          {links.map((l) => (
            <li key={l.label}>
              <NavLink 
                to={l.to} 
                end={l.to === '/'} 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active-link' : (isLightText ? 'light-link' : 'dark-link')}`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-toggle"
          aria-label="Menu"
        >
          <span className={getHamburgerClass('top')} />
          <span className={getHamburgerClass('middle')} />
          <span className={getHamburgerClass('bottom')} />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`page-shell mobile-overlay ${menuOpen ? 'overlay-open' : 'overlay-closed'}`}>
        <ul className="mobile-menu-list">
          {links.map((l) => (
            <li key={l.label}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? 'active-link' : 'inactive-link'}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
