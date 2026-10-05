import Navbar from "@/components/Navbar/Navbar";
import HeroSection from "@/components/HeroSection/HeroSection";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-inter text-[#0A2044]">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
      </main>
    </div>
  );
}


