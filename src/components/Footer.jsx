import { Link } from 'react-router-dom';
import logo from '../assets/CJ.png';
import '../styles/Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-section">
      <div className="page-shell footer-shell">

        {/* ── Top Grid ── */}
        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <img
                src={logo}
                alt="Chiya Jivan"
                className="footer-logo"
              />
              <span className="footer-title">
                Chiya Jivan
              </span>
            </div>
            <p className="footer-brand-desc">
              A sanctuary of slow sips and Himalayan warmth.
            </p>
            <div className="footer-social-links">
              {[
                { id: 'footer-ig', href: 'https://instagram.com', label: 'IG' },
                { id: 'footer-fb', href: 'https://facebook.com', label: 'FB' },
                { id: 'footer-tt', href: 'https://tiktok.com', label: 'TK' },
              ].map((s) => (
                <a
                  key={s.id}
                  id={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Navigate */}
          <div className="footer-nav">
            <p className="footer-col-title">
              Navigate
            </p>
            <ul className="footer-nav-list">
              {[
                { label: 'Home', to: '/' },
                { label: 'Menu', to: '/menu' },
                { label: 'Social', to: '/social' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="footer-nav-link"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Visit Us */}
          <div className="footer-visit">
            <p className="footer-col-title">
              Visit Us
            </p>
            <address className="footer-address">
              <p className="footer-address-text">
                Thamel Marg<br />
                Kathmandu, Nepal — 44600
              </p>
              <p className="footer-address-text">Daily: 7 AM – 9 PM</p>
              <a
                href="mailto:hello@chiyajivan.com"
                className="footer-contact-link"
              >
                hello@chiyajivan.com
              </a>
            </address>
          </div>

        </div>

        {/* ── Bottom Bar ── */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {year} Chiya Jivan. All rights reserved.
          </p>
          <p className="footer-credit">
            Crafted with warmth in Kathmandu
          </p>
        </div>

      </div>
    </footer>
  );
}
