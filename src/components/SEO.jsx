import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title, 
  description, 
  keywords, 
  ogTitle, 
  ogDescription, 
  ogImage, 
  ogUrl,
  canonical 
}) {
  const siteTitle = "Chiya Jivan";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDescription = "Authentic handcrafted Himalayan teas in Kathmandu. Experience the warmth of tradition at Chiya Jivan.";
  const defaultKeywords = "Chiya Jivan, Tea Shop Kathmandu, Best Masala Tea Nepal, Thamel Cafe, Himalayan Tea";

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description || defaultDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl || "https://chiyajivan.com"} />
      <meta property="og:image" content={ogImage || "/src/assets/hero_chiya_1775634815239.png"} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description || defaultDescription} />
      <meta name="twitter:image" content={ogImage || "/src/assets/hero_chiya_1775634815239.png"} />
    </Helmet>
  );
}
