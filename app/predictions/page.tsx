"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

interface PredictionMarket {
  id: string;
  title: string;
  description: string;
  category: "price" | "volume" | "holders" | "events";
  endTime: Date;
  totalPool: number;
  participants: number;
  options: {
    id: string;
    label: string;
    odds: number;
    percentage: number;
    pool: number;
  }[];
  aiConfidence: number;
  aiPrediction: string;
  status: "active" | "ended" | "settling";
}

interface UserPrediction {
  marketId: string;
  optionId: string;
  amount: number;
  timestamp: Date;
  status: "pending" | "won" | "lost";
}

const PredictionsPage = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<
    "markets" | "portfolio" | "leaderboard"
  >("markets");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "price" | "volume" | "holders" | "events"
  >("all");
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [betAmount, setBetAmount] = useState<string>("");

  // Mock data for prediction markets
  const predictionMarkets: PredictionMarket[] = [
    {
      id: "1",
      title: "WHALE Token Price Prediction",
      description: "Will WHALE token reach $0.50 by end of week?",
      category: "price",
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      totalPool: 1250.5,
      participants: 89,
      options: [
        {
          id: "yes",
          label: "Yes, above $0.50",
          odds: 2.4,
          percentage: 42,
          pool: 525.21,
        },
        {
          id: "no",
          label: "No, below $0.50",
          odds: 1.8,
          percentage: 58,
          pool: 725.29,
        },
      ],
      aiConfidence: 78,
      aiPrediction: "yes",
      status: "active",
    },
    {
      id: "2",
      title: "Daily Battle Arena Winner",
      description: "Which token will win today's battle arena?",
      category: "events",
      endTime: new Date(Date.now() + 18 * 60 * 60 * 1000),
      totalPool: 890.3,
      participants: 156,
      options: [
        {
          id: "token1",
          label: "PANDA AI",
          odds: 3.2,
          percentage: 31,
          pool: 276.0,
        },
        {
          id: "token2",
          label: "STREAM",
          odds: 2.1,
          percentage: 48,
          pool: 427.3,
        },
        {
          id: "token3",
          label: "CREATOR",
          odds: 4.5,
          percentage: 21,
          pool: 187.0,
        },
      ],
      aiConfidence: 65,
      aiPrediction: "token2",
      status: "active",
    },
    {
      id: "3",
      title: "Trading Volume Milestone",
      description: "Will total platform volume exceed 10M RBTC this month?",
      category: "volume",
      endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      totalPool: 2100.8,
      participants: 234,
      options: [
        {
          id: "exceed",
          label: "Yes, above 10M",
          odds: 1.9,
          percentage: 53,
          pool: 1113.4,
        },
        {
          id: "below",
          label: "No, below 10M",
          odds: 2.2,
          percentage: 47,
          pool: 987.4,
        },
      ],
      aiConfidence: 82,
      aiPrediction: "exceed",
      status: "active",
    },
  ];

  const categories = [
    { id: "all", label: "All Markets", icon: "🎯" },
    { id: "price", label: "Price Predictions", icon: "📈" },
    { id: "volume", label: "Volume Bets", icon: "📊" },
    { id: "holders", label: "Holder Growth", icon: "👥" },
    { id: "events", label: "Platform Events", icon: "🏆" },
  ];

  const filteredMarkets =
    selectedCategory === "all"
      ? predictionMarkets
      : predictionMarkets.filter(
          (market) => market.category === selectedCategory
        );

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const placeBet = (marketId: string, optionId: string) => {
    if (!isConnected || !betAmount) return;

    const newPrediction: UserPrediction = {
      marketId,
      optionId,
      amount: parseFloat(betAmount),
      timestamp: new Date(),
      status: "pending",
    };

    setUserPredictions([...userPredictions, newPrediction]);
    setBetAmount("");
    // In real implementation, this would interact with smart contracts
  };

  return (
    <div className=" bg-white">
      <Header />

      {/* Hero Section */}
      <div className="px-10 border w-full">
        <div className="min-h-[40vh] text-black flex flex-col justify-center text-white border-l border-r border-transparent [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1] ">
          <div className="mx-auto text-black text-center max-w-4xl">
            <p className="text-lg text-black ">
              AI-powered market intelligence
            </p>
            <p className="font-britisans text-black text-[52px] font-bold mt-6 leading-tight">
              Predict. Bet. Win.
            </p>
            <p className="text-lg text-black mt-4 max-w-2xl mx-auto">
              Use advanced analytics and community wisdom to predict token
              performance, battle outcomes, and platform milestones. Earn
              rewards for accurate predictions.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: "markets", label: "Prediction Markets", icon: "🎯" },
            { id: "portfolio", label: "My Predictions", icon: "📊" },
            { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "markets" && (
          <div>
            {/* Category Filter */}
            <div className="flex flex-wrap gap-3 mb-8">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as any)}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === category.id
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>

            {/* Prediction Markets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMarkets.map((market) => (
                <Card
                  key={market.id}
                  className="border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                          {market.title}
                        </CardTitle>
                        <p className="text-gray-600 text-sm">
                          {market.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {market.category}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Market Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {market.totalPool.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Total Pool (RBTC)
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {market.participants}
                        </p>
                        <p className="text-xs text-gray-500">Participants</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatTimeRemaining(market.endTime)}
                        </p>
                        <p className="text-xs text-gray-500">Time Left</p>
                      </div>
                    </div>

                    {/* AI Prediction */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-purple-600">🤖</span>
                          <span className="font-medium text-gray-900">
                            AI Prediction
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-800"
                        >
                          {market.aiConfidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        AI suggests:{" "}
                        <span className="font-semibold">
                          {
                            market.options.find(
                              (opt) => opt.id === market.aiPrediction
                            )?.label
                          }
                        </span>
                      </p>
                    </div>

                    {/* Betting Options */}
                    <div className="space-y-3">
                      {market.options.map((option) => (
                        <div
                          key={option.id}
                          className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">
                              {option.label}
                            </span>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600">
                                {option.odds}x
                              </span>
                              <span className="text-sm font-medium text-purple-600">
                                {option.percentage}%
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={option.percentage}
                            className="h-2 mb-2"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {option.pool.toFixed(2)} RBTC in pool
                            </span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                placeholder="0.1"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                className="w-20 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              <Button
                                size="sm"
                                onClick={() => placeBet(market.id, option.id)}
                                disabled={!isConnected || !betAmount}
                                className="text-xs"
                              >
                                Bet
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    +24.5%
                  </div>
                  <div className="text-sm text-gray-600">Total Return</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-gray-600">Active Bets</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">78%</div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* User Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>My Recent Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                {userPredictions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No predictions yet. Start betting to see your portfolio!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userPredictions.map((prediction, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Market #{prediction.marketId}
                          </p>
                          <p className="text-sm text-gray-600">
                            Option: {prediction.optionId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {prediction.amount} RBTC
                          </p>
                          <Badge
                            variant={
                              prediction.status === "won"
                                ? "default"
                                : prediction.status === "lost"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {prediction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Predictors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      rank: 1,
                      address: "0x1234...5678",
                      winRate: 89,
                      totalReturn: "+156.7%",
                      badge: "🥇",
                    },
                    {
                      rank: 2,
                      address: "0x8765...4321",
                      winRate: 85,
                      totalReturn: "+134.2%",
                      badge: "🥈",
                    },
                    {
                      rank: 3,
                      address: "0x9876...1234",
                      winRate: 82,
                      totalReturn: "+98.5%",
                      badge: "🥉",
                    },
                    {
                      rank: 4,
                      address: "0x5432...8765",
                      winRate: 78,
                      totalReturn: "+76.3%",
                      badge: "",
                    },
                    {
                      rank: 5,
                      address: "0x2468...1357",
                      winRate: 75,
                      totalReturn: "+65.1%",
                      badge: "",
                    },
                  ].map((user) => (
                    <div
                      key={user.rank}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">
                          {user.badge || `#${user.rank}`}
                        </span>
                        <div>
                          <p className="font-medium">{user.address}</p>
                          <p className="text-sm text-gray-600">
                            {user.winRate}% win rate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {user.totalReturn}
                        </p>
                        <p className="text-sm text-gray-600">Total Return</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement System */}
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      title: "First Prediction",
                      description: "Place your first bet",
                      icon: "🎯",
                      unlocked: true,
                    },
                    {
                      title: "Lucky Streak",
                      description: "Win 5 predictions in a row",
                      icon: "🔥",
                      unlocked: true,
                    },
                    {
                      title: "Big Winner",
                      description: "Win over 100 RBTC",
                      icon: "💰",
                      unlocked: false,
                    },
                    {
                      title: "AI Challenger",
                      description: "Beat AI predictions 10 times",
                      icon: "🤖",
                      unlocked: false,
                    },
                    {
                      title: "Market Maker",
                      description: "Create a prediction market",
                      icon: "🏗️",
                      unlocked: false,
                    },
                    {
                      title: "Prophet",
                      description: "90% win rate over 50 bets",
                      icon: "🔮",
                      unlocked: false,
                    },
                  ].map((achievement) => (
                    <div
                      key={achievement.title}
                      className={`p-4 border rounded-lg text-center ${
                        achievement.unlocked
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <h3 className="font-medium mb-1">{achievement.title}</h3>
                      <p className="text-sm text-gray-600">
                        {achievement.description}
                      </p>
                      {achievement.unlocked && (
                        <Badge className="mt-2 bg-green-600">Unlocked</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connect Wallet CTA */}
        {!isConnected && (
          <Card className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Connect Your Wallet to Start Predicting
              </h3>
              <p className="text-gray-600 mb-4">
                Join the prediction markets and earn rewards for accurate
                forecasts
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PredictionsPage;
