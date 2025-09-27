"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  Coins,
  Trophy,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  action?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Whale.fun! 🐋",
    description:
      "Your gateway to the most exciting meme token ecosystem. Let's get you started on your journey to becoming a crypto whale!",
    icon: <Sparkles className="w-8 h-8 text-blue-500" />,
    features: [
      "Launch your own meme tokens",
      "Trade with the community",
      "Battle in the arena",
      "Build your portfolio",
    ],
  },
  {
    id: 2,
    title: "Explore Tokens",
    description:
      "Discover trending meme tokens, analyze their performance, and find the next big thing before it moons!",
    icon: <Rocket className="w-8 h-8 text-green-500" />,
    features: [
      "Browse trending tokens",
      "View real-time charts",
      "Check community sentiment",
      "Filter by categories",
    ],
    action: "Visit Explore page",
  },
  {
    id: 3,
    title: "Launch Your Token",
    description:
      "Create your own meme token in minutes! Set up tokenomics, add liquidity, and watch your community grow.",
    icon: <Coins className="w-8 h-8 text-yellow-500" />,
    features: [
      "Easy token creation",
      "Custom tokenomics",
      "Built-in liquidity pools",
      "Community tools",
    ],
    action: "Start launching",
  },
  {
    id: 4,
    title: "Battle Arena",
    description:
      "Compete with other traders in epic battles! Show off your trading skills and climb the leaderboards.",
    icon: <Trophy className="w-8 h-8 text-red-500" />,
    features: [
      "PvP trading battles",
      "Real-time competitions",
      "Skill-based matchmaking",
      "Exclusive rewards",
    ],
    action: "Enter Arena",
  },
  {
    id: 5,
    title: "Your Portfolio",
    description:
      "Track your investments, monitor performance, and manage your growing crypto empire all in one place.",
    icon: <Briefcase className="w-8 h-8 text-purple-500" />,
    features: [
      "Real-time portfolio tracking",
      "P&L analytics",
      "Transaction history",
      "Performance insights",
    ],
    action: "View Portfolio",
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={handleSkip}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Getting Started
              </DialogTitle>
              <Badge variant="secondary" className="mr-8">
                {currentStep + 1} of {tutorialSteps.length}
              </Badge>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">{step.icon}</div>
            <CardTitle className="text-xl">{step.title}</CardTitle>
            <CardDescription className="text-base">
              {step.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {step.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {step.action && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  💡 Next step: {step.action}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <Button onClick={handleSkip} variant="ghost">
            Skip Tutorial
          </Button>

          <Button onClick={handleNext} className="flex items-center  space-x-2">
            <span>
              {currentStep === tutorialSteps.length - 1
                ? "Get Started"
                : "Next"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
