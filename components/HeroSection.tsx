"use client";
import { Component } from "react";
import { Button } from "./ui/button";
import Header from "./layout/Header";
import Link from "next/link";
import { WelcomeBanner } from "./onboarding/WelcomeBanner";
import { useUser } from "@/hooks/useUser";
import Image from "next/image";

function HeroSection() {
  const { user, isNewUser, showOnboarding, dismissOnboarding } = useUser();

  const handleStartTutorial = () => {
    // The onboarding modal will be triggered by the useUser hook
    // when showOnboarding is true
  };

  return (
    <div>
      <Header />
      {user && isNewUser && !user.isOnboarded && (
        <WelcomeBanner
          userName={user.profile?.displayName}
          onStartTutorial={handleStartTutorial}
          onDismiss={dismissOnboarding}
        />
      )}
      <div className="px-10 border w-full">
        <div
          className="min-h-[90vh] flex flex-col  justify-start text-white
  border-l border-r border-transparent
  [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1] 
  bg-[url('/img/bg-vector.svg')] bg-contain bg-no-repeat"
        >
          <div className="mx-auto text-center">
            <p className=" text-lg pt-32">shaped by votes, secured by locks.</p>
            <p className="font-britisans text-[62px]   font-bold mt-6 max-w-3xl leading-18 text-center">
              Launch tokens on-stream. co-created and safe.
            </p>
            <p className="flex gap-2 mt-3 text-lg text-center justify-center  items-center">
              built on{" Rootstock "}
              <Image
                src="/icons/0g.svg"
                alt="Rootstock Logo"
                width={40}
                height={40}
                priority
              />
            </p>
          </div>
          <div className="flex justify-between pt-5 items-center px-10">
            <div className="text-black flex flex-col gap-3">
              <p className="font-bradley font-bold text-[22px]">For Viewers</p>
              <p className="text-[38px] font-britisans max-w-xs -line-clamp-6 leading-10">
                Discover live token launches.
              </p>

              <p className="max-w-sm">
                Watch streams, vote on decisions, see locks/audits at a glance,
                and buy safely to join the community.
              </p>
              <Link href="/explore">
                <Button className="text-white cursor-pointer">
                  Explore token launches
                </Button>
              </Link>
            </div>
            <div className="text-black flex flex-col gap-3">
              <p className="font-bradley font-bold text-[22px]">For Creators</p>
              <p className="text-[38px] font-britisans max-w-xs -line-clamp-6 leading-10">
                Launch tokens live with your audience.{" "}
              </p>

              <p className="max-w-sm">
                Run quick polls for name, fees, and art—then mint in one click
                with liquidity locks and audit checks.
              </p>
              <Link href="/create-token">
                <Button className="text-white cursor-pointer">
                  Go Live & Launch{" "}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
