"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BattleToken {
  id: string;
  name: string;
  symbol: string;
  currentRank: number;
  previousRank: number;
  tradingVolume24h: number;
  holderGrowth: number;
  communityScore: number;
  totalScore: number;
  creator: string;
}

const BattleArenaPage = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<
    "current" | "leaderboard" | "history" | "register"
  >("current");
  const [selectedToken, setSelectedToken] = useState<string>("");

  // Mock data for current battle
  const currentBattle = {
    title: "Daily Trading Championship",
    description: "Tokens compete on trading volume, holder growth, and community engagement",
    prizePool: 500.0,
    participants: 24,
    timeLeft: "6h 23m",
    metrics: { tradingVolume: 40, holderGrowth: 30, communityEngagement: 30 },
  };

  // Mock battle participants
  const battleTokens: BattleToken[] = [
    {
      id: "1", name: "Whale Token", symbol: "WHALE", currentRank: 1, previousRank: 3,
      tradingVolume24h: 125000, holderGrowth: 15.2, communityScore: 89, totalScore: 94.5,
      creator: "0x1234...5678"
    },
    {
      id: "2", name: "Stream Token", symbol: "STREAM", currentRank: 2, previousRank: 1,
      tradingVolume24h: 98000, holderGrowth: 12.8, communityScore: 85, totalScore: 91.2,
      creator: "0x8765...4321"
    },
    {
      id: "3", name: "Creator Coin", symbol: "CREATE", currentRank: 3, previousRank: 2,
      tradingVolume24h: 87500, holderGrowth: 18.5, communityScore: 78, totalScore: 88.7,
      creator: "0x9876...1234"
    },
  ];

  const userTokens = [
    { id: "user1", name: "My Token", symbol: "MYTKN", registered: false },
    { id: "user2", name: "Creator Token", symbol: "CRTR", registered: true },
  ];

  const getRankChange = (current: number, previous: number) => {
    const change = previous - current;
    if (change > 0) return { direction: "up", value: change };
    if (change < 0) return { direction: "down", value: Math.abs(change) };
    return { direction: "same", value: 0 };
  };

  const achievements = [
    { title: "First Battle", description: "Register for your first battle", icon: "⚔️", unlocked: true },
    { title: "Champion", description: "Win a daily battle", icon: "🏆", unlocked: true },
    { title: "Streak Master", description: "Win 3 battles in a row", icon: "🔥", unlocked: false },
    { title: "Volume King", description: "Achieve highest trading volume", icon: "📈", unlocked: false },
  ];

  return (
    <div className="bg-white">
      <Header />

      {/* Hero Section */}
      <div className="px-10 border w-full">
        <div className="min-h-[40vh] text-black flex flex-col justify-center border-l border-r border-transparent [border-image:linear-gradient(to_bottom,#ebe3e8,transparent)_1]">
          <div className="mx-auto text-black text-center max-w-4xl">
            <p className="text-lg text-black">Gamified token competition</p>
            <p className="font-britisans text-black text-[52px] font-bold mt-6 leading-tight">
              Battle Arena
            </p>
            <p className="text-lg text-black mt-4 max-w-2xl mx-auto">
              Enter your tokens into daily battles. Compete on trading volume, holder growth, and community engagement. Winners receive boosted liquidity and featured placement.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: "current", label: "Current Battle", icon: "⚔️" },
            { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
            { id: "history", label: "Battle History", icon: "📜" },
            { id: "register", label: "Register Token", icon: "🎯" },
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

        {activeTab === "current" && (
          <div className="space-y-8">
            {/* Current Battle Info */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {currentBattle.title}
                </CardTitle>
                <p className="text-gray-700">{currentBattle.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {currentBattle.prizePool} RBTC
                    </div>
                    <div className="text-sm text-gray-600">Prize Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {currentBattle.participants}
                    </div>
                    <div className="text-sm text-gray-600">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {currentBattle.timeLeft}
                    </div>
                    <div className="text-sm text-gray-600">Time Left</div>
                  </div>
                </div>

                {/* Scoring Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Trading Volume</span>
                      <span className="text-purple-600 font-bold">
                        {currentBattle.metrics.tradingVolume}%
                      </span>
                    </div>
                    <Progress value={currentBattle.metrics.tradingVolume} className="h-2" />
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Holder Growth</span>
                      <span className="text-blue-600 font-bold">
                        {currentBattle.metrics.holderGrowth}%
                      </span>
                    </div>
                    <Progress value={currentBattle.metrics.holderGrowth} className="h-2" />
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Community Score</span>
                      <span className="text-green-600 font-bold">
                        {currentBattle.metrics.communityEngagement}%
                      </span>
                    </div>
                    <Progress value={currentBattle.metrics.communityEngagement} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Battle Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Live Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {battleTokens.map((token, index) => {
                    const rankChange = getRankChange(token.currentRank, token.previousRank);
                    return (
                      <div
                        key={token.id}
                        className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                          index < 3 ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-2xl font-bold ${
                                index === 0 ? "text-yellow-600" : index === 1 ? "text-gray-500" : index === 2 ? "text-orange-600" : "text-gray-400"
                              }`}>
                                #{token.currentRank}
                              </span>
                              {rankChange.direction === "up" && (
                                <span className="text-green-600 text-sm">↗️ +{rankChange.value}</span>
                              )}
                              {rankChange.direction === "down" && (
                                <span className="text-red-600 text-sm">↘️ -{rankChange.value}</span>
                              )}
                              {index < 3 && (
                                <span className="text-2xl">
                                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-lg font-bold">{token.symbol.charAt(0)}</span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{token.name}</h3>
                                <p className="text-sm text-gray-600">${token.symbol} • {token.creator}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-6 text-center">
                            <div>
                              <div className="text-lg font-bold text-purple-600">{token.totalScore.toFixed(1)}</div>
                              <div className="text-xs text-gray-500">Total Score</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-blue-600">{(token.tradingVolume24h / 1000).toFixed(0)}K</div>
                              <div className="text-xs text-gray-500">24h Volume</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">+{token.holderGrowth.toFixed(1)}%</div>
                              <div className="text-xs text-gray-500">Holder Growth</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">{token.communityScore}</div>
                              <div className="text-xs text-gray-500">Community</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "register" && (
          <Card>
            <CardHeader>
              <CardTitle>Register Token for Battle</CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Connect your wallet to register tokens for battles</p>
                  <Button className="bg-purple-600 hover:bg-purple-700">Connect Wallet</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Token to Register
                    </label>
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Choose a token...</option>
                      {userTokens.filter((token) => !token.registered).map((token) => (
                        <option key={token.id} value={token.id}>
                          {token.name} (${token.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Registration Requirements</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Token must have minimum 100 holders</li>
                      <li>• Minimum 24h trading volume of 10 RBTC</li>
                      <li>• Registration fee: 5 RBTC</li>
                      <li>• Token must be created on this platform</li>
                    </ul>
                  </div>

                  <Button
                    disabled={!selectedToken}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Register for Next Battle (5 RBTC)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Battle Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.title}
                  className={`p-4 border rounded-lg text-center ${
                    achievement.unlocked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h3 className="font-medium mb-1">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  {achievement.unlocked && <Badge className="mt-2 bg-green-600">Unlocked</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BattleArenaPage;
