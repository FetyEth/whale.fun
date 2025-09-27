"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUser } from "@/hooks/useUser";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

function Header() {
  const { user, showOnboarding, completeOnboarding, dismissOnboarding } = useUser();
  
  const navItems = [
    { name: "Explore", href: "/explore" },
    { name: "Launch", href: "/launch" },
    { name: "Arena", href: "/arena" },
    { name: "Portfolio", href: "/portfolio" },
  ];
  return (
    <div className="flex items-center justify-between px-20 py-4 border-[#ebe3e8] bg-white border-b">
      <div className="flex gap-x-2 items-center">
        <img src="/logo.svg" alt="Logo" className="h-7 w-14" />
        <p className="font-satoshi text-3xl font-bold">Whale.fun</p>
      </div>
      <div className="flex gap-x-8 text-lg font-instrument font-medium items-center">
        {navItems.map((item) => (
          <a key={item.name} href={item.href} className="transition-colors">
            {item.name}
          </a>
        ))}
        <div>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              // Note: If your app doesn't use authentication, you
              // can remove all 'authenticationStatus' checks
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === "authenticated");
              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} type="button">
                          Connect Wallet
                        </button>
                      );
                    }
                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button">
                          Wrong network
                        </button>
                      );
                    }
                    return (
                      <div className="bg-black flex gap-3 items-center text-white px-5 py-2 rounded-xl relative">
                        <button onClick={openAccountModal} type="button">
                          {account.displayName}
                        </button>
                        <img
                          src="/icons/wallet.svg"
                          alt="Profile"
                          className="h-6 w-6 rounded-full "
                        />
                        {user && !user.isOnboarded && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-2 -right-2 text-xs px-1 py-0 h-5"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
      
      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={dismissOnboarding}
        onComplete={completeOnboarding}
      />
    </div>
  );
}

export default Header;
