
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import { getSession } from "@/lib/getSession";

export const dynamic = 'force-dynamic';

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
