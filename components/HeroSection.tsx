import { Component } from "react";
import { Button } from "./ui/button";
import Header from "./layout/Header";
import Link from "next/link";

export class HeroSection extends Component {
  render() {
    return (
      <div>
        <Header />
        <div className="px-10 border w-full">
          <div
            className="min-h-[90vh] flex flex-col  justify-start text-white
  border-l border-r border-transparent
  [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1] 
  bg-[url('/img/bg-vector.svg')] bg-contain bg-no-repeat"
          >
            <div className="mx-auto text-center">
              <p className=" text-lg pt-32">
                shaped by votes, secured by locks.
              </p>
              <p className="font-britisans text-[59px]  font-bold mt-6 max-w-3xl text-center">
                Launch tokens on-stream. co-created and safe.
              </p>
              <p className="flex gap-2 mt-8 text-lg items-center">
                built on{" "}
                <img src="/icons/0g.svg" alt="Logo" className="w-10 h-10" />
              </p>
            </div>
            <div className="flex justify-between items-center px-10">
              <div className="text-black flex flex-col gap-3">
                <p className="font-bradley font-bold text-[22px]">
                  For Viewers
                </p>
                <p className="text-[38px] font-britisans max-w-xs -line-clamp-6 leading-10">
                  Discover live token launches.
                </p>

                <p className="max-w-sm">
                  Watch streams, vote on decisions, see locks/audits at a
                  glance, and buy safely to join the community.
                </p>
                <Link href="#">
                  <Button className="text-white cursor-pointer">
                    Explore token launches
                  </Button>
                </Link>
              </div>
              <div className="text-black flex flex-col gap-3">
                <p className="font-bradley font-bold text-[22px]">
                  For Viewers
                </p>
                <p className="text-[38px] font-britisans max-w-xs -line-clamp-6 leading-10">
                  Launch tokens live with your audience.{" "}
                </p>

                <p className="max-w-sm">
                  Run quick polls for name, fees, and art—then mint in one click
                  with liquidity locks and audit checks.
                </p>
                <Link href="#">
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
}

export default HeroSection;
