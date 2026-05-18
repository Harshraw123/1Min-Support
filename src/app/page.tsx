import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/marketing/HeroSection";
import FeaturesSectionServer from "@/components/marketing/FeaturesSectionServer";
import TestimonialsSectionServer from "@/components/marketing/TestimonialsSectionServer";
import FaqSectionServer from "@/components/marketing/FaqSectionServer";
import CTASectionServer from "@/components/marketing/CTASectionServer";
import FooterServer from "@/components/layout/FooterServer";
import { getSession } from "@/lib/auth/getSession";
import { ProcessFlow } from "@/components/marketing/ProcessFlow";

export const dynamic = 'force-dynamic';

const Index = async () => {
  const user = await getSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar user={user}  />
      <HeroSection isAuthenticated={Boolean(user)} serverUser={user} />
      <ProcessFlow/>
      <TestimonialsSectionServer />
      
      <FeaturesSectionServer />
      <FaqSectionServer />
      <CTASectionServer />
      <FooterServer />
    </div>
  );
};

export default Index;
