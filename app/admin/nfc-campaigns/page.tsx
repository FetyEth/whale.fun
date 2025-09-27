"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NFCRewardHandler } from "@/lib/nfc/nfcHandler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface Campaign {
  id: string;
  name: string;
  description: string;
  rewardAmount: string;
  maxRewardsPerUser: number;
  maxTotalRewards: number;
  currentRewardsDistributed: number;
  remainingRewards: number;
  progressPercentage: number;
  isActive: boolean;
  locationRestricted: boolean;
  allowedLocations?: string[];
  startTime: number;
  endTime: number;
  isExpired: boolean;
  daysRemaining: number;
  createdBy: string;
  createdAt: number;
}

interface CreateCampaignData {
  name: string;
  description: string;
  rewardAmount: string;
  maxRewardsPerUser: number;
  maxTotalRewards: number;
  locationRestricted: boolean;
  allowedLocations: string[];
  durationDays: number;
  createdBy: string;
}

export default function AdminCampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create campaign form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCampaignData>({
    name: "",
    description: "",
    rewardAmount: "100000000000000000000", // 100 WHALE in wei
    maxRewardsPerUser: 3,
    maxTotalRewards: 1000,
    locationRestricted: false,
    allowedLocations: [],
    durationDays: 30,
    createdBy: "admin", // In real app, get from auth
  });

  // NFC tag registration state
  const [showNFCDialog, setShowNFCDialog] = useState(false);
  const [nfcForm, setNfcForm] = useState({
    nfcId: "",
    campaignId: "",
    location: "",
  });

  const handler = new NFCRewardHandler();

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/nfc/campaigns");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load campaigns");
      }

      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError(null);

      // Validate form
      if (!createForm.name.trim() || !createForm.description.trim()) {
        throw new Error("Name and description are required");
      }

      if (
        createForm.locationRestricted &&
        createForm.allowedLocations.length === 0
      ) {
        throw new Error(
          "At least one location must be specified when location restricted"
        );
      }

      const response = await fetch("/api/nfc/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      setSuccess(`Campaign "${createForm.name}" created successfully!`);
      setShowCreateDialog(false);

      // Reset form
      setCreateForm({
        name: "",
        description: "",
        rewardAmount: "100000000000000000000",
        maxRewardsPerUser: 3,
        maxTotalRewards: 1000,
        locationRestricted: false,
        allowedLocations: [],
        durationDays: 30,
        createdBy: "admin",
      });

      // Reload campaigns
      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
    }
  };

  const handleToggleCampaign = async (
    campaignId: string,
    isActive: boolean
  ) => {
    try {
      setError(null);

      const response = await fetch(`/api/nfc/campaigns?id=${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update campaign");
      }

      setSuccess(
        `Campaign ${!isActive ? "activated" : "deactivated"} successfully!`
      );
      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update campaign"
      );
    }
  };

  const handleRegisterNFC = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError(null);

      if (!nfcForm.nfcId.trim() || !nfcForm.campaignId) {
        throw new Error("NFC ID and campaign are required");
      }

      await handler.registerNFCTag(
        nfcForm.nfcId.trim(),
        nfcForm.campaignId,
        nfcForm.location.trim() || undefined
      );

      setSuccess(`NFC tag "${nfcForm.nfcId}" registered successfully!`);
      setShowNFCDialog(false);

      // Reset form
      setNfcForm({
        nfcId: "",
        campaignId: "",
        location: "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register NFC tag"
      );
    }
  };

  const handleLocationAdd = (location: string) => {
    if (
      location.trim() &&
      !createForm.allowedLocations.includes(location.trim())
    ) {
      setCreateForm({
        ...createForm,
        allowedLocations: [...createForm.allowedLocations, location.trim()],
      });
    }
  };

  const handleLocationRemove = (index: number) => {
    setCreateForm({
      ...createForm,
      allowedLocations: createForm.allowedLocations.filter(
        (_, i) => i !== index
      ),
    });
  };

  const formatWhaleAmount = (amountWei: string) => {
    try {
      return (parseFloat(amountWei) / 1e18).toFixed(0);
    } catch {
      return "0";
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading campaign management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🎯 NFC Campaign Management</h1>
            <p className="text-gray-600 mt-2">
              Create and manage NFC reward campaigns
            </p>
          </div>

          <div className="space-x-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>➕ Create Campaign</Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Campaign Name *</Label>
                      <Input
                        id="name"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, name: e.target.value })
                        }
                        placeholder="e.g., Summer Rewards 2024"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe the campaign and how users can earn rewards..."
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rewardAmount">
                        Reward Amount (WHALE) *
                      </Label>
                      <Input
                        id="rewardAmount"
                        type="number"
                        min="1"
                        value={formatWhaleAmount(createForm.rewardAmount)}
                        onChange={(e) => {
                          const whaleAmount = parseFloat(e.target.value) || 0;
                          const weiAmount = (whaleAmount * 1e18).toString();
                          setCreateForm({
                            ...createForm,
                            rewardAmount: weiAmount,
                          });
                        }}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (days) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="365"
                        value={createForm.durationDays}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            durationDays: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxPerUser">Max Rewards Per User *</Label>
                      <Input
                        id="maxPerUser"
                        type="number"
                        min="1"
                        value={createForm.maxRewardsPerUser}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            maxRewardsPerUser: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxTotal">Max Total Rewards *</Label>
                      <Input
                        id="maxTotal"
                        type="number"
                        min="1"
                        value={createForm.maxTotalRewards}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            maxTotalRewards: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="locationRestricted"
                        checked={createForm.locationRestricted}
                        onCheckedChange={(checked) =>
                          setCreateForm({
                            ...createForm,
                            locationRestricted: checked,
                          })
                        }
                      />
                      <Label htmlFor="locationRestricted">
                        Restrict to specific locations
                      </Label>
                    </div>

                    {createForm.locationRestricted && (
                      <div>
                        <Label>Allowed Locations</Label>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Enter location name..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleLocationAdd(
                                    (e.target as HTMLInputElement).value
                                  );
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }}
                            />
                          </div>

                          {createForm.allowedLocations.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {createForm.allowedLocations.map(
                                (location, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="pr-1"
                                  >
                                    📍 {location}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleLocationRemove(index)
                                      }
                                      className="ml-2 text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Campaign</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showNFCDialog} onOpenChange={setShowNFCDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">🏷️ Register NFC Tag</Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register NFC Tag</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleRegisterNFC} className="space-y-4">
                  <div>
                    <Label htmlFor="nfcId">NFC Tag ID *</Label>
                    <Input
                      id="nfcId"
                      value={nfcForm.nfcId}
                      onChange={(e) =>
                        setNfcForm({ ...nfcForm, nfcId: e.target.value })
                      }
                      placeholder="e.g., nfc-001, tag-abc123"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="campaignSelect">Campaign *</Label>
                    <select
                      id="campaignSelect"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={nfcForm.campaignId}
                      onChange={(e) =>
                        setNfcForm({ ...nfcForm, campaignId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select a campaign...</option>
                      {campaigns
                        .filter((c) => c.isActive && !c.isExpired)
                        .map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} (
                            {formatWhaleAmount(campaign.rewardAmount)} WHALE)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="tagLocation">Location (optional)</Label>
                    <Input
                      id="tagLocation"
                      value={nfcForm.location}
                      onChange={(e) =>
                        setNfcForm({ ...nfcForm, location: e.target.value })
                      }
                      placeholder="e.g., conference-hall-1"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNFCDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Register Tag</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alert Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="space-y-2">
                <div className="text-4xl">🎯</div>
                <h3 className="text-lg font-medium">No Campaigns</h3>
                <p className="text-gray-600">
                  Create your first NFC reward campaign to get started!
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
                        ) : campaign.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {campaign.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div className="font-bold text-lg text-blue-600">
                          {formatWhaleAmount(campaign.rewardAmount)} WHALE
                        </div>
                        <div className="text-gray-500">per tap</div>
                      </div>

                      {!campaign.isExpired && (
                        <Switch
                          checked={campaign.isActive}
                          onCheckedChange={() =>
                            handleToggleCampaign(campaign.id, campaign.isActive)
                          }
                        />
                      )}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Max per user:</span>
                      <div>{campaign.maxRewardsPerUser} rewards</div>
                    </div>

                    <div>
                      <span className="font-medium">Time remaining:</span>
                      <div
                        className={
                          campaign.isExpired ? "text-red-600" : "text-green-600"
                        }
                      >
                        {campaign.daysRemaining > 0
                          ? `${campaign.daysRemaining}d`
                          : "Expired"}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">Created by:</span>
                      <div>{campaign.createdBy}</div>
                    </div>

                    <div>
                      <span className="font-medium">Campaign ID:</span>
                      <div className="font-mono text-xs">{campaign.id}</div>
                    </div>
                  </div>

                  {campaign.locationRestricted && campaign.allowedLocations && (
                    <>
                      <Separator />
                      <div>
                        <span className="font-medium text-sm">
                          Allowed Locations:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campaign.allowedLocations.map((loc) => (
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
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8">
          <p>
            🌊 WHALE NFC Campaign Management | Create engaging reward
            experiences
          </p>
        </div>
      </div>
    </div>
  );
}
