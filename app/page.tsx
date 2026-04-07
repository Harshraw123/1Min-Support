
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import { getSession } from "@/lib/getSession";

export const dynamic = 'force-dynamic'; 
// I added export const dynamic = 'force-dynamic' to the page.tsx file. This tells Next.js that this route needs to be dynamically rendered because it uses cookies, which resolves the "Dynamic server usage" error.

const Index = async () => {
  const user = await getSession();

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection isAuthenticated={Boolean(user)} />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
