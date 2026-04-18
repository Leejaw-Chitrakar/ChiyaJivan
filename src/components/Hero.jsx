import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToSocialContent } from '../lib/firestoreService';
import '../styles/Hero.css';

export default function Hero() {
  const contentRef = useRef(null);
  const [social, setSocial] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToSocialContent((data) => setSocial(data));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    const t = setTimeout(() => {
      el.style.transition = 'opacity 1.5s ease-out, transform 1.2s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="home" className="hero-section">
      {/* Background Image Layer */}
      <div className="hero-background">
        <img
          src="/hero_chiya.png"
          alt="Atmospheric Tea Scene"
          className="hero-bg-img"
        />
        <div className="hero-overlay-dark" />
        <div className="hero-overlay-gradient" />
      </div>

      {/* Centered Editorial Content */}
      <div className="page-shell hero-content-wrapper">
        <div ref={contentRef} className="hero-card">
          {/* Eyebrow */}
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-line" />
            Est. 2024 · Bhaktapur
            <span className="hero-eyebrow-line" />
          </p>

          {/* Headline */}
          <h1 className="hero-headline">
            Chiya <em className="hero-headline-italic">Jivan</em>
          </h1>

          {/* Sub-tagline */}
          <p className="hero-tagline">
            {social ? social.quote : "A sanctuary of slow sips and Himalayan warmth."}
          </p>

          {/* CTA Row */}
          <div className="hero-cta-group">
            <Link to="/menu" className="hero-btn-primary">
              Explore Menu
            </Link>
            <Link to="/social" className="hero-btn-secondary">
              Our Story
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <span className="scroll-text">Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
