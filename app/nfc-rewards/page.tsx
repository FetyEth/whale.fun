"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  WebNFCHandler,
  NFCTapResult,
  CampaignInfo,
  NFCUtils,
} from "@/lib/nfc/nfcHandler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NFCRewardPageProps {
  defaultWalletAddress?: string;
  defaultLocation?: string;
}

export default function NFCRewardPage({
  defaultWalletAddress,
  defaultLocation,
}: NFCRewardPageProps) {
  // State management
  const [isScanning, setIsScanning] = useState(false);
  const [lastReward, setLastReward] = useState<NFCTapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nfcHandler, setNfcHandler] = useState<WebNFCHandler | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User input state
  const [walletAddress, setWalletAddress] = useState(
    defaultWalletAddress || ""
  );
  const [location, setLocation] = useState(defaultLocation || "");
  const [tagDetected, setTagDetected] = useState<string | null>(null);

  // NFC support check
  const [nfcSupported, setNfcSupported] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const handler = new WebNFCHandler();
      const data = await handler.getCampaigns();
      setCampaigns(data.campaigns);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      setError("Failed to load reward campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check NFC support
    setNfcSupported(WebNFCHandler.isSupported());

    // Initialize NFC handler
    const handler = new WebNFCHandler();
    setNfcHandler(handler);

    // Load campaigns
    loadCampaigns();
  }, [loadCampaigns]);

  const handleStartScanning = useCallback(async () => {
    if (!nfcHandler) return;

    if (!walletAddress.trim()) {
      setError("Please enter your wallet address to receive rewards");
      return;
    }

    try {
      setError(null);
      setTagDetected(null);

      await nfcHandler.startNFCScanning(
        walletAddress.trim(),
        location.trim() || undefined,
        {
          onTagDetected: (nfcId) => {
            console.log("🏷️ NFC tag detected:", nfcId);
            setTagDetected(nfcId);
            setError(null);
          },
          onSuccess: (result) => {
            console.log("🎉 Reward received:", result);
            setLastReward(result);
            setError(null);
            setTagDetected(null);

            // Reload campaigns to update stats
            loadCampaigns();

            // Auto-stop scanning after successful reward
            setTimeout(() => {
              if (nfcHandler) {
                nfcHandler.stopNFCScanning();
                setIsScanning(false);
                setTagDetected(null);
              }
            }, 3000);
          },
          onError: (errorMsg) => {
            console.error("❌ NFC error:", errorMsg);
            setError(errorMsg);
            setTagDetected(null);
          },
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start NFC scanning";
      setError(errorMsg);
      console.error("NFC scanning error:", err);
    }
  }, [nfcHandler, walletAddress, location, loadCampaigns]);

  const handleStopScanning = useCallback(() => {
    if (nfcHandler) {
      nfcHandler.stopNFCScanning();
    }
    setIsScanning(false);
    setTagDetected(null);
  }, [nfcHandler]);

  const clearLastReward = () => {
    setLastReward(null);
    setError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Loading NFC reward campaigns...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🏷️ Tap to Earn WHALE Tokens
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Scan NFC tags with your phone to instantly earn WHALE tokens!
            Connect your wallet and start collecting rewards from active
            campaigns.
          </p>

          {stats && (
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span>📊 {stats.activeCampaigns} Active Campaigns</span>
              <span>🏷️ {stats.activeNFCTags} NFC Tags</span>
              <span>🎁 Rewards Available</span>
            </div>
          )}
        </div>

        {/* NFC Support Alert */}
        {!nfcSupported && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              ⚠️ <strong>NFC not supported</strong> - This browser doesn&apos;t
              support Web NFC. Try using Chrome on Android or enable
              experimental web platform features.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scanner">🔍 NFC Scanner</TabsTrigger>
            <TabsTrigger value="campaigns">🎯 Active Campaigns</TabsTrigger>
          </TabsList>

          {/* NFC Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            {/* Wallet Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Wallet Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wallet">Wallet Address *</Label>
                  <Input
                    id="wallet"
                    placeholder="0x... (Enter your wallet address to receive rewards)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., conference-hall-1, booth-a12"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Some campaigns require specific locations
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* NFC Scanner */}
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  📱 NFC Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Scanner Button */}
                <div>
                  <Button
                    onClick={
                      isScanning ? handleStopScanning : handleStartScanning
                    }
                    variant={isScanning ? "destructive" : "default"}
                    size="lg"
                    className="w-full max-w-xs"
                    disabled={!nfcSupported}
                  >
                    {isScanning ? "🛑 Stop Scanning" : "🚀 Start NFC Scanning"}
                  </Button>
                </div>

                {/* Scanning Status */}
                {isScanning && (
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        <div className="animate-pulse bg-blue-500 rounded-full h-4 w-4 mr-3"></div>
                        <span className="text-blue-700 font-medium">
                          📱 Hold your device near an NFC tag...
                        </span>
                      </div>

                      {tagDetected && (
                        <div className="text-sm text-blue-600">
                          🏷️ Tag detected: {tagDetected}
                          <br />⚡ Processing reward...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <Alert className="border-red-200 bg-red-50 text-left">
                    <AlertDescription className="text-red-800">
                      ❌ <strong>Error:</strong> {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success/Reward Display */}
                {lastReward && lastReward.success && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-4">
                        <div className="text-3xl">🎉</div>
                        <h3 className="text-xl font-bold text-green-800">
                          Reward Received!
                        </h3>

                        <div className="space-y-3 text-left">
                          <div className="flex justify-between">
                            <span className="font-medium">Amount:</span>
                            <span className="font-bold text-green-700">
                              {lastReward.reward?.amountFormatted} WHALE
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-medium">Campaign:</span>
                            <span>{lastReward.campaign?.name}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-medium">NFC Tag:</span>
                            <span className="font-mono text-sm">
                              {lastReward.tapData?.nfcId}
                            </span>
                          </div>

                          {lastReward.campaign?.userRemainingRewards !==
                            undefined && (
                            <div className="flex justify-between">
                              <span className="font-medium">Remaining:</span>
                              <span>
                                {lastReward.campaign.userRemainingRewards}{" "}
                                rewards left
                              </span>
                            </div>
                          )}

                          {lastReward.reward?.txHash && (
                            <div className="text-xs text-gray-600 break-all">
                              <strong>TX:</strong> {lastReward.reward.txHash}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={clearLastReward}
                          variant="outline"
                          size="sm"
                        >
                          ✨ Scan for More Rewards
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Instructions */}
                {!isScanning && !lastReward && (
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <strong>How to use:</strong>
                    </p>
                    <ol className="text-left space-y-1 list-decimal list-inside">
                      <li>Enter your wallet address above</li>
                      <li>Click &quot;Start NFC Scanning&quot;</li>
                      <li>Hold your phone near an NFC tag</li>
                      <li>Receive WHALE tokens instantly!</li>
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="space-y-2">
                    <div className="text-4xl">🎯</div>
                    <h3 className="text-lg font-medium">No Active Campaigns</h3>
                    <p className="text-gray-600">
                      There are no active reward campaigns at the moment. Check
                      back later for new opportunities!
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            {campaign.name}
                            {campaign.isExpired ? (
                              <Badge variant="secondary">Expired</Badge>
                            ) : (
                              <Badge variant="default">Active</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {campaign.description}
                          </p>
                        </div>

                        <div className="text-right text-sm">
                          <div className="font-bold text-lg text-blue-600">
                            {NFCUtils.formatRewardAmount(campaign.rewardAmount)}{" "}
                            WHALE
                          </div>
                          <div className="text-gray-500">per tap</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{campaign.progressPercentage}% complete</span>
                        </div>
                        <Progress
                          value={campaign.progressPercentage}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>
                            {campaign.currentRewardsDistributed} /{" "}
                            {campaign.maxTotalRewards} rewards claimed
                          </span>
                          <span>{campaign.remainingRewards} remaining</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Max per user:</span>
                          <div>{campaign.maxRewardsPerUser} rewards</div>
                        </div>

                        <div>
                          <span className="font-medium">Time remaining:</span>
                          <div
                            className={
                              campaign.isExpired
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {NFCUtils.formatTimeRemaining(campaign.endTime)}
                          </div>
                        </div>

                        {campaign.locationRestricted && (
                          <div className="col-span-2">
                            <span className="font-medium">Locations:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {campaign.allowedLocations?.map((loc) => (
                                <Badge
                                  key={loc}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  📍 {loc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8">
          <p>🌊 Powered by whale.fun | Tap NFC tags to earn WHALE tokens</p>
          <p>
            Make sure NFC is enabled on your device and you&apos;re using a
            compatible browser
          </p>
        </div>
      </div>
    </div>
  );
}
