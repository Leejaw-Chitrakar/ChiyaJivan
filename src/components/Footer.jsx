import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToSocialContent } from '../lib/firestoreService';
import logo from '../assets/CJ.png';
import '../styles/Footer.css';

export default function Footer() {
  const [social, setSocial] = useState(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    const unsubscribe = subscribeToSocialContent((data) => {
      setSocial(data);
    });
    return () => unsubscribe();
  }, []);

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
              {social ? social.story : "A sanctuary of slow sips and Himalayan warmth."}
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
                {social ? (social.address || '').split(',').map((line, i) => (
                  <span key={i}>{line.trim()}{i !== (social.address || '').split(',').length - 1 && <br />}</span>
                )) : "Golmadhi, Bhaktapur, Nepal".split(',').map((line, i) => (
                  <span key={i}>{line.trim()}{i !== "Golmadhi, Bhaktapur, Nepal".split(',').length - 1 && <br />}</span>
                ))}
              </p>
              <p className="footer-address-text mt-3">
                {social ? social.weekdays : "Daily: 7 AM – 9 PM"}
              </p>
              {social?.weekend && (
                <p className="footer-address-text">
                  {social.weekend}
                </p>
              )}
              {social?.phone && (
                <a
                  href={`tel:${social.phone.replace(/\s+/g, '')}`}
                  className="footer-contact-link mt-2"
                >
                  {social.phone}
                </a>
              )}
              {(!social || social.email !== "") && (
                <a
                  href={`mailto:${social ? social.email : "hello@chiyajivan.com"}`}
                  className="footer-contact-link"
                >
                  {social ? social.email : "hello@chiyajivan.com"}
                </a>
              )}
            </address>
          </div>

        </div>

        {/* ── Bottom Bar ── */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {year} Chiya Jivan. All rights reserved.
          </p>
          <p className="footer-credit">
            Crafted with warmth in Bhaktapur
          </p>
        </div>

      </div>
    </footer>
  );
}
