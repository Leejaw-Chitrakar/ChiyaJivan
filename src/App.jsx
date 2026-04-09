import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Menu from './components/Menu';
import Social from './components/Social';
import Footer from './components/Footer';
import './index.css';

export default function App() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar />
      <main>
        <Hero />
        <Menu />
        <Social />
      </main>
      <Footer />
    </div>
  );
}
