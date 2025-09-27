import React from "react";

// Placeholder icons to match the design
const IconCreators = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-8 h-8 text-black"
  >
    <path
      d="M20 17V7M4 17V7M4 7H20V17H4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 12H20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconFans = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-8 h-8 text-black"
  >
    <path
      d="M17 20V18C17 15.7909 15.2091 14 13 14H8C5.79086 14 4 15.7909 4 18V20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 10C13 12.2091 11.2091 14 9 14C6.79086 14 5 12.2091 5 10C5 7.79086 6.79086 6 9 6C11.2091 6 13 7.79086 13 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 12V14M18 10V14H20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconEveryone = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-8 h-8 text-black"
  >
    <path
      d="M12 21.6498C12 21.6498 19 18.6498 19 12.6498V5.6498L12 2.6498L5 5.6498V12.6498C5 18.6498 12 21.6498 12 21.6498Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 12.1498L11.5 14.1498L15 10.1498"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function PodSection() {
  return (
    <div className="px-4 md:px-16 lg:px-32">
      <div className="flex flex-col py-10 justify-center border-[#ebe3e8] border-l border-r items-center">
        {/* Top Section */}
        <div className="text-center px-4">
          <p className="inline-block bg-[#f5f5f5] font-instrument font-medium text-base px-4 py-1.5 rounded-full">
            BUILT FOR THE POD
          </p>
          <h1 className="font-britisans font-semibold pt-3 text-4xl md:text-5xl max-w-[720px] text-center leading-tight md:leading-snug">
            Built for creators.{" "}
            <span className="text-[#B65FFF]">Safe for fans.</span>
            <br />
            Fun for everyone.
          </h1>
          <p className="max-w-xs mx-auto pb-12 text-lg text-center pt-2 text-gray-600">
            Co-create live, mint in one click, and launch with safety rails on.
          </p>
        </div>

        {/* Cards Section */}
        <div className="flex bg-[url('/img/bg-pod.svg')] bg-no-repeat w-full bg-cover flex-col md:flex-row  p-4 items-stretch">
          {/* Card 1 */}
          <div className="flex-1 flex flex-col p-8 rounded-2xl">
            <IconCreators />
            <h3 className="font-britisans font-medium text-xl mt-4">
              For creators
            </h3>
            <p className="text-gray-600 mt-2">
              Earn from trading fees and tips the moment you mint—plus built-in
              discovery and analytics to grow faster.
            </p>
            <p className="mt-auto pt-4 italic text-gray-800">
              &quot;Instant monetization, zero code.&quot;
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex-1 flex flex-col p-8  rounded-2xl">
            <IconFans />
            <h3 className="font-britisans font-medium text-xl mt-4">
              For fans
            </h3>
            <p className="text-gray-600 mt-2">
              Vote on the token&apos;s basics, buy safely with locks in place,
              and track your holdings as the community scales.
            </p>
            <p className="mt-auto pt-4 italic text-gray-800">
              &quot;Own a piece of the moment.&quot;
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex-1 flex flex-col p-8  rounded-2xl">
            <IconEveryone />
            <h3 className="font-britisans font-medium text-xl mt-4">
              For everyone
            </h3>
            <p className="text-gray-600 mt-2">
              Liquidity locks, audit checks, and MEV-aware deploys add
              protection without killing the fun.
            </p>
            <p className="mt-auto pt-4 italic text-gray-800">
              &quot;Rug-safer by design.&quot;
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center text-center mt-20 px-4">
          <p className="inline-block bg-[#f5f5f5] font-instrument font-medium text-base px-4 py-1.5 rounded-full">
            MAKE YOUR MOVE
          </p>
          <h2 className="font-britisans font-semibold pt-3 text-4xl md:text-5xl max-w-[720px] text-center leading-tight md:leading-snug">
            Turn hype into <span className="text-[#B65FFF]">holdings</span>
          </h2>
          <p className="max-w-sm mx-auto text-xl text-center pt-2 text-gray-600">
            Co-create a token on-stream—safer with liquidity locks and audit
            checks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button className="bg-black text-white px-6 py-3 rounded-lg font-medium">
              Explore token launches
            </button>
            <button className="bg-white border border-gray-300 text-black px-6 py-3 rounded-lg font-medium">
              Go Live & Launch
            </button>
          </div>
          <div>
            <img
              src="/img/boxdown.svg"
              alt="Arrow Down"
              className="w-full h-full mt-10 mx-auto border-t"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PodSection;
