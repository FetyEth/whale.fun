import React from "react";
import type { FC } from "react";

// A simple square icon component to be used next to the links
const SquareIcon: FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="stroke-current text-gray-500"
  >
    <rect x="0.5" y="0.5" width="15" height="15" strokeOpacity="0.5" />
  </svg>
);

// Data for the footer links to keep the JSX clean
const footerLinks = {
  column1: [
    { name: "X", href: "#" },
    { name: "Telegram", href: "#" },
  ],
  column2: [
    { name: "Explore", href: "#" },
    { name: "Launch", href: "#" },
    { name: "Arena", href: "#" },
    { name: "Portfolio", href: "#" },
  ],
};

const Footer: FC = () => {
  return (
    <footer className="bg-white border-t px-32 border-gray-200  w-full">
      <div className="border-r border-l  border-gray-200 ">
        {/* This container holds the content and the giant background text */}
        <div className="relative   max-w-7xl mx-auto  sm:px-6 lg:px-8 py-16 overflow-hidden">
          {/* Giant background text */}
          <div
            className="absolute inset-0 flex items-center justify-center -z-10"
            aria-hidden="true"
          >
            <h1 className="text-[20vw] md:text-[15vw] lg:text-[12rem] font-bold bg-gradient-to-b from-gray-200 to-transparent bg-clip-text text-transparent whitespace-nowrap">
              Whale.fun
            </h1>
          </div>

          {/* Top section with description and links */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Left side: Description */}
            <div className="w-full md:w-1/3">
              <p className="text-gray-800 text-base leading-relaxed">
                Watch, vote, and own as creators mint lock-secured tokens live.
              </p>
            </div>

            {/* Right side: Links */}
            <div className="flex gap-16">
              {/* Column 1 */}
              <ul className="space-y-3">
                {footerLinks.column1.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="flex items-center gap-3 text-gray-800 hover:text-blue-500 transition-colors"
                    >
                      <SquareIcon />
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
              {/* Column 2 */}
              <ul className="space-y-3">
                {footerLinks.column2.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="flex items-center gap-3 text-gray-800 hover:text-blue-500 transition-colors"
                    >
                      <SquareIcon />
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="mx-auto text-center text-[250px] text-[#b7b7b7]">
        Whale.fun
      </p>
    </footer>
  );
};

export default Footer;
