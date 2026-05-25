import Hero from '@/components/hero/Hero';
import Demo from '@/components/sections/Demo';
import Architecture from '@/components/sections/Architecture';
import FAQ from '@/components/sections/FAQ';
import Docs from '@/components/sections/Docs';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <Demo />
      <Architecture />
      <Docs />
      <FAQ />
      <Footer />
    </main>
  );
}
