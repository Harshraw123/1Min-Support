import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSectionServer from "./components/FeaturesSectionServer";
import TestimonialsSectionServer from "./components/TestimonialsSectionServer";
import FaqSectionServer from "./components/FaqSectionServer";
import CTASectionServer from "./components/CTASectionServer";
import FooterServer from "./components/FooterServer";
import { getSession } from "@/lib/getSession";

export const dynamic = 'force-dynamic';

const Index = async () => {
  const user = await getSession();

  return (
    <div className="min-h-screen">
      <Navbar user={user}  />
      <HeroSection isAuthenticated={Boolean(user)} serverUser={user} />
      <FeaturesSectionServer />
      <TestimonialsSectionServer />
      <FaqSectionServer />
      <CTASectionServer />
      <FooterServer />
    </div>
  );
};

export default Index;
