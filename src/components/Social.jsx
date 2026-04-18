import { useState, useEffect } from 'react';
import { subscribeToSocialContent } from '../lib/firestoreService';
import "../styles/Social.css";

const posts = [
  {
    id: "post-1",
    src: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=600&fit=crop&q=80",
    alt: "Masala chai close-up",
    caption: "The morning ritual begins",
  },
  {
    id: "post-2",
    src: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop&q=80",
    alt: "Clay cups",
    caption: "Two cups, one conversation",
  },
  {
    id: "post-3",
    src: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&h=600&fit=crop&q=80",
    alt: "Cozy corner",
    caption: "Your favourite corner awaits",
  },
  {
    id: "post-4",
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop&q=80",
    alt: "Tea ceremony",
    caption: "From the hills of Ilam",
  },
  {
    id: "post-5",
    src: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop&q=80",
    alt: "Sel roti",
    caption: "Sel roti sunday",
  },
  {
    id: "post-6",
    src: "https://images.unsplash.com/photo-1475855581690-80accde3ae2b?w=600&h=600&fit=crop&q=80",
    alt: "Saffron tea",
    caption: "Golden hour in a glass",
  },
  {
    id: "post-7",
    src: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop&q=80",
    alt: "Morning",
    caption: "Mornings like these",
  },
  {
    id: "post-8",
    src: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?w=600&h=600&fit=crop&q=80",
    alt: "Teapot pour",
    caption: "Slow pour, slow life",
  },
  {
    id: "post-9",
    src: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600&h=600&fit=crop&q=80",
    alt: "Interior",
    caption: "Come as you are",
  },
];

export default function Social() {
  const [social, setSocial] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToSocialContent((data) => setSocial(data));
    return () => unsubscribe();
  }, []);

  return (
    <section id="social" className="section-spacing social-section">
      <div className="page-shell">
        {/* Section Header */}
        <div className="social-header">
          <p className="social-eyebrow">Instagram</p>
          <div className="social-title-area">
            <h2 className="social-headline">@ChiyaJivan</h2>
            <p className="social-desc">
              {social ? (
                social.story
              ) : (
                <>
                  Tag us with <span className="social-desc-highlight">#ChiyaJivan</span> to be featured in our feed.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="social-grid">
          {posts.map((post) => (
            <div key={post.id} id={post.id} className="social-post">
              <img src={post.src} alt={post.alt} className="social-img" />
              {/* Hover overlay */}
              <div className="social-overlay" />
              {/* Caption */}
              <div className="social-caption-wrap">
                <p className="social-caption">{post.caption}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="social-cta-area">
          <p className="social-cta-text">Follow for daily moments of warmth</p>
          <a
            href="https://instagram.com/chiya_jivan"
            id="instagram-follow-btn"
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn"
          >
            Follow on Instagram
            <svg
              className="social-btn-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
