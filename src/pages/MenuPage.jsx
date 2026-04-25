import Menu from '../components/Menu';
import SEO from '../components/SEO';

export default function MenuPage() {
  return (
    <>
      <SEO 
        title="Our Menu" 
        description="Explore the Chiya Jivan menu: from our signature Milk Masala Tea and Hot Lemon Honey Ginger to authentic Buff and Chicken Momos. Handcrafted flavors from the Himalayas."
        keywords="Chiya Jivan Menu, Masala Tea, Himalayan Snacks, Momo Menu Kathmandu, Nepali Tea"
      />
      <Menu />
    </>
  );
}
