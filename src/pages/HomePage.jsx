import Hero from '../components/Hero';
import SEO from '../components/SEO';

export default function HomePage() {
  return (
    <>
      <SEO 
        title="Home" 
        description="Chiya Jivan offers authentic handcrafted teas rooted in Himalayan tradition. Visit our cozy sanctuary in Thamel, Kathmandu for Milk Masala Tea, local snacks, and a moment of quiet."
      />
      <Hero />
    </>
  );
}
