"use client";
import HeroSection from "@/components/HeroSection";
import Howitworks from "@/components/Howitworks";
import MoveSection from "@/components/Footer";
import PodSection from "@/components/PodSection";
import PoolSection from "@/components/PoolSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <Howitworks />
      <PoolSection />
      <PodSection />
      <Footer />
    </main>
  );
}
