"use client";
import HeroSection from "@/components/HeroSection";
import Howitworks from "@/components/Howitworks";
import MoveSection from "@/components/MoveSection";
import PodSection from "@/components/PodSection";
import PoolSection from "@/components/PoolSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <Howitworks />
      <PoolSection />
      <PodSection />
      <MoveSection />
    </main>
  );
}
