"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import TradingViewChart from "@/components/TradingViewChart";
import { Copy, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { tokenDataViemService, type TokenData } from "@/lib/services/TokenDataViemService";
import { getBlockchainConnection } from "@/utils/Blockchain";
import { formatEther } from "ethers";
import tokenDataService from "@/lib/services/TokenDataService";
import StreamPlayer from "@/components/StreamPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const TokenStat = ({
  name,
  percent,
  votes,
  eth,
  selected,
  onClick,
}: {
  name: string;
  percent: string;
  votes: string;
  eth: string;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className={`group flex-1 border-dashed cursor-pointer transition-colors duration-200 ${
      selected ? "bg-[#B65FFF]" : "bg-white hover:bg-[#DAADFF]"
    }`}
  >
    <CardContent className="p-6 text-center">
      <p
        className={`text-xs uppercase tracking-wider transition-colors duration-200 ${
          selected ? "text-white" : "text-[#0000004D] group-hover:text-white"
        }`}
      >
        Token Name
      </p>
      <p
        className={`text-2xl font-extrabold transition-colors duration-200 ${
          selected ? "text-white" : "text-[#B65FFF] group-hover:text-white"
        }`}
      >
        {name}
      </p>
      <div className="mt-3">
        <span
          className={`text-5xl leading-none font-black transition-colors duration-200 ${
            selected ? "text-white" : "text-gray-900 group-hover:text-white"
          }`}
        >
          {percent}
        </span>
      </div>
      <p
        className={`mt-2 text-xs transition-colors duration-200 ${
          selected ? "text-white" : "text-gray-900 group-hover:text-white"
        }`}
      >
        {votes} votes
      </p>
      <p
        className={`mt-1 text-xs transition-colors duration-200 ${
          selected ? "text-white" : "text-gray-900 group-hover:text-white"
        }`}
      >
        {eth} ETH
      </p>
    </CardContent>
  </Card>
);

const TradePage = () => {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const tokenAddress = params?.address || "";

  // State management
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);

  // Livestream state
  const [selectedToken, setSelectedToken] = useState<"WHALE" | "ARROW">("WHALE");
  const [bossOpen, setBossOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  // Trade panel state (match Livestream UI)
  const [tradeMode, setTradeMode] = useState<"Buy" | "Sell">("Buy");
  const [tradeToken, setTradeToken] = useState<"ART" | "0G">("ART");
  const [amount, setAmount] = useState<string>("");
  const [balances, setBalances] = useState<Record<string, number>>({ "0G": 42.23, ART: 0 });
  const activeBalance = balances[tradeToken];
  const parsedAmount = Number(amount || 0);
  // Modal flow
  const [showSetup, setShowSetup] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatAllowed, setChatAllowed] = useState(false);
  // Go Live form state
  const [glTitle, setGlTitle] = useState("Token Name");
  const [glDesc, setGlDesc] = useState("");
  const [glUser, setGlUser] = useState("");
  const [glCam, setGlCam] = useState(true);
  const [glMic, setGlMic] = useState(true);
  const [glRec, setGlRec] = useState(false);
  const [glMirror, setGlMirror] = useState(false);
  // Huddle identifiers for inline publish/recording
  const [roomId, setRoomId] = useState<string>("");
  const [huddleToken, setHuddleToken] = useState<string>("");

  // Fetch token data on mount
  useEffect(() => {
    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress]);

  // Update default stream title when token data loads
  useEffect(() => {
    if (tokenData?.name) {
      setGlTitle(tokenData.name);
    }
  }, [tokenData?.name]);

  // Refresh token data after successful trade
  const handleTradeSuccess = () => {
    fetchTokenData();
  };

  const fetchTokenData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const connection = await getBlockchainConnection();
      const chainId = Number(connection.network.chainId);
      
      const data = await tokenDataViemService.getTokenData(tokenAddress, chainId);
      if (data) {
        setTokenData(data);
        // TODO: Fetch user's token balance
        // setUserBalance(userTokenBalance);
      } else {
        setError("Token not found");
      }
    } catch (err: any) {
      console.error("Error fetching token data:", err);
      setError(err.message || "Failed to fetch token data");
    } finally {
      setLoading(false);
    }
  };


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading token data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Token not found"}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="px-6 md:px-10 lg:px-16 xl:px-24 py-6 mt-5">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Token Info + Chart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Token header */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6 flex gap-4 items-center">
                <div className="h-12 w-12 rounded-xl bg-gray-100 border border-[#0000001A] overflow-hidden">
                  <Avatar className="h-full w-full rounded-xl">
                    <AvatarImage src={tokenData.logoUrl} alt={tokenData.name} />
                    <AvatarFallback>{tokenData.symbol.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900 truncate">
                    {tokenData.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-sm">
                    <span className="font-bold text-gray-900">{tokenData.symbol}</span>
                    {tokenData.isLive && (
                      <Badge variant="destructive" className="bg-green-500 text-white">
                        LIVE
                      </Badge>
                    )}
                    <span className="px-2 py-0.5 rounded-full border border-[#0000001A] text-gray-800 bg-white">
                      {tokenData.age}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEFEF] text-gray-800 border cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? "Copied!" : `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSetup(true)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white cursor-pointer"
                    >
                      Go Live
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video player (shown after permissions) */}
            {permissionsGranted ? (
              <>
                <StreamPlayer
                  camEnabled={glCam}
                  micEnabled={glMic}
                  onToggleCam={() => setGlCam((v) => !v)}
                  onToggleMic={() => setGlMic((v) => !v)}
                  onEndStream={() => {
                    // End should only stop camera/mic and keep the page; no preview popup
                    setPermissionsGranted(false);
                    setShowChat(false);
                    // Turn off local states so StreamPlayer won't try to re-acquire
                    setGlCam(false);
                    setGlMic(false);
                    setGlRec(false);
                    // Clear identifiers so no further publish/record attempts
                    setRoomId("");
                    setHuddleToken("");
                  }}
                  recEnabled={glRec}
                  onToggleRec={() => setGlRec((v) => !v)}
                  mirrorEnabled={glMirror}
                  onToggleMirror={() => setGlMirror((v) => !v)}
                  roomId={roomId}
                  token={huddleToken}
                />
              </>
            ) : (
              <>
              </>
            )}

            {/* Price and stats */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Current Price</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatEther(tokenData.currentPrice)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Market Cap</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenDataService.formatMarketCap(tokenData.marketCap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">24h Volume</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenDataService.formatVolume(tokenData.dailyVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Holders</p>
                    <p className="text-xl font-bold text-gray-900">
                      {tokenData.holderCount.toString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart placeholder */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Trading chart will be integrated here</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar - Same order as Livestream: Boss Battle -> Trade -> Live Chat */}
          <div className="space-y-4">
            {/* Boss Battle card (always visible) */}
              <Card className="border-gray-200 mt-0">
                <CardHeader className="">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <span>
                        <img src="/icons/trophy.svg" alt="trophy" width={24} height={24} />
                      </span>
                      <span className="text-[18px] font-semibold">Boss Battle</span>
                      <span className="flex items-center gap-2">
                        <span className="relative inline-flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                        </span>
                        <span className="text-red-600 font-semibold drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]">Live</span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full cursor-pointer"
                      onClick={() => setBossOpen((v) => !v)}
                      aria-expanded={bossOpen}
                      aria-label="Toggle Boss Battle"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform duration-200 ${
                          bossOpen ? "-rotate-180" : "rotate-0"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <hr className="mx-6 -mt-4 border-[#0000001A]" />
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/coins-stacked.svg" alt="coins-stacked" width={24} height={24} />
                      </span>
                      <div className="leading-tight">
                        <p className="font-semibold">Pool 48.8 ETH</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/clock.svg" alt="clock" width={24} height={24} />
                      </span>
                      <div className="leading-tight">
                        <p className="font-semibold">Round 1/3</p>
                        <p className="text-xs text-gray-500">02:37</p>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center gap-2 border rounded-lg px-3 py-2">
                      <span>
                        <img src="/icons/people.svg" alt="eye" width={24} height={24} />
                      </span>
                      <p className="font-semibold">12,837 live</p>
                    </div>
                  </div>

                  {/* Slide-down content */}
                  <div
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                      bossOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Token Selection Section */}
                      <div>
                        {selectedToken ? (
                          <p className="text-sm text-gray-600 mb-2">
                            you have selected <span className="font-semibold">{selectedToken}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mb-2">Select your chosen token</p>
                        )}

                        {/* Token Stats (WHALE/ARROW) */}
                        <div className="flex gap-3">
                          <TokenStat
                            name="WHALE"
                            percent="61%"
                            votes="1,284"
                            eth="7.1"
                            selected={selectedToken === "WHALE"}
                            onClick={() => setSelectedToken("WHALE")}
                          />
                          <TokenStat
                            name="ARROW"
                            percent="39%"
                            votes="796"
                            eth="5.3"
                            selected={selectedToken === "ARROW"}
                            onClick={() => setSelectedToken("ARROW")}
                          />
                        </div>
                      </div>

                      {/* Stake/Vote Section */}
                      <div className="space-y-3 pt-2">
                        <Input type="number" placeholder="Amount (ETH)" className="h-11 bg-[#E5E5E566]" />
                        <Button className="w-full h-11 rounded-xl font-semibold cursor-pointer">
                          {`Stake & Vote ${selectedToken}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Trade card (same UI as Livestream, always visible) */}
              <Card className="border-gray-200 mt-2">
                <CardContent className="p-2 md:p-3 space-y-3">
                  {/* Tabs container */}
                  <div className="p-0 flex gap-1" style={{ borderColor: '#0000001A' }}>
                    <button
                      onClick={() => setTradeMode("Buy")}
                      className={`flex-1 px-6 py-2 rounded-2xl font-semibold transition-colors duration-200 cursor-pointer ${
                        tradeMode === "Buy"
                          ? "bg-[#B65FFF] text-white hover:bg-[#A24EE6]"
                          : "bg-[#F2F2F2] text-gray-700 border hover:bg-[#DAADFF] hover:text-white"
                      }`}
                      style={tradeMode === "Buy" ? undefined : { borderColor: '#0000001A' }}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeMode("Sell")}
                      className={`flex-1 px-6 py-2 rounded-2xl font-semibold transition-colors duration-200 cursor-pointer ${
                        tradeMode === "Sell"
                          ? "bg-[#B65FFF] text-white hover:bg-[#A24EE6]"
                          : "bg-[#F2F2F2] text-gray-700 border hover:bg-[#DAADFF] hover:text-white"
                      }`}
                      style={tradeMode === "Sell" ? undefined : { borderColor: '#0000001A' }}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Utility buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setTradeToken((t) => (t === "ART" ? "0G" : "ART"))}
                      className="px-3 py-1 text-sm rounded-full bg-[#EFEFEF] text-gray-800 border cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      {tradeToken === "ART" ? "Switch to 0G" : "Switch to ART"}
                    </button>
                    <button
                      onClick={() => setAmount(String(activeBalance))}
                      className="px-3 py-1 text-sm rounded-full bg-[#EFEFEF] text-gray-800 border cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Set max to slippage
                    </button>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold text-gray-900">Balance:</div>
                    <div className="text-xl font-semibold text-gray-900">{activeBalance} {tradeToken}</div>
                  </div>

                  {/* Amount field */}
                  <div className="border rounded-xl px-3 py-2 flex items-center justify-between bg-white" style={{ borderColor: '#0000001A' }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent outline-none text-2xl font-medium placeholder:text-gray-400"
                    />
                    { tradeToken === "ART" ? "ART" : <img src="/icons/0G-logo.svg" alt="token" width={28} height={28} className="ml-3" /> }
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                    <button
                      onClick={() => setAmount("")}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Reset
                    </button>
                    {[0.10, 0.5, 10].map((val, i) => (
                      <button
                        key={i}
                        onClick={() => setAmount(String(val))}
                        className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                        style={{ borderColor: '#0000001A' }}
                      >
                        {val} {tradeToken}
                      </button>
                    ))}
                    <button
                      onClick={() => setAmount(String(activeBalance))}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                    >
                      Max
                    </button>
                  </div>

                  {/* Primary action */}
                  <Button
                    disabled={!amount || parsedAmount <= 0}
                    className={`w-full h-12 rounded-2xl text-lg font-semibold text-white cursor-pointer ${!amount || parsedAmount <= 0 ? "bg-black/60 cursor-not-allowed" : "bg-black"}`}
                  >
                    {tradeMode} {tradeToken}
                  </Button>
                </CardContent>
              </Card>

            {/* Live Chat (always visible) */}
              <Card className="border-gray-200 mt-6">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Live Chat</CardTitle>
                    <div className="text-sm text-gray-400">New message will appear here</div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <hr className="border-[#0000001A]" />
                  <div className="space-y-4">
                    {/* Right aligned message */}
                    <div className="flex justify-end">
                      <div className="max-w-[70%] bg-[#EAD6FF] text-gray-900 px-4 py-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">Hey chat</span>
                          <span className="text-xs text-gray-500">23:07</span>
                        </div>
                      </div>
                    </div>
                    {/* Left aligned message */}
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] border rounded-2xl px-4 py-3 shadow-sm" style={{ borderColor: '#0000001A' }}>
                        <div className="text-sm text-emerald-600 font-semibold">aamx8e</div>
                        <div className="mt-1 text-[15px] text-gray-900 flex items-end gap-3">
                          <span>buying your token</span>
                          <span className="text-xs text-gray-500">23:59</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Input placeholder="Write a message.." className="h-12 rounded-xl bg-[#F2F2F2] placeholder:text-gray-400" />
                    <img src="/icons/send-button.svg" alt="send-button" width={34} height={34} className="cursor-pointer" />
                  </div>
                </CardContent>
              </Card>
            

            {/* Token Info */}
            <Card className="border-gray-200">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About {tokenData.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{tokenData.description}</p>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creator:</span>
                    <span className="font-medium">{tokenData.creator.slice(0, 6)}...{tokenData.creator.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Launched:</span>
                    <span className="font-medium">{tokenData.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Supply:</span>
                    <span className="font-medium">{formatEther(tokenData.totalSupply)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Sold:</span>
                    <span className="font-medium">{formatEther(tokenData.totalSold)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Setup Modal (title/description) */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-gray-900 border border-[#0000001A] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-semibold">Go live setup</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Add your stream name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Token name" value={glTitle} onChange={(e) => setGlTitle(e.target.value)} />
            <Input placeholder="Description" value={glDesc} onChange={(e) => setGlDesc(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <button
              className="h-10 px-4 rounded-xl bg-black text-white font-medium hover:bg-black/90"
              onClick={() => {
                setShowSetup(false);
                setShowTerms(true);
              }}
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms and Conditions Modal */}
      <Dialog open={showTerms && !acceptedTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white text-gray-900 border border-[#0000001A] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[20px] font-semibold">Terms and conditions</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Whale.fun Livestream Moderation Policy</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto space-y-5 text-[13px] leading-6 pr-1">
            <div>
              <p className="font-semibold text-gray-900">Purpose</p>
              <p className="text-gray-600">To cultivate a social environment on Whale.fun that preserves creativity and freedom of expression and encourages meaningful engagement amongst users, free of illegal, harmful, and negative interactions.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Restriction on Underage Use</p>
              <p className="text-gray-600">Livestreaming is restricted to users above the age of 18. Whale.fun takes this user restriction seriously.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Prohibited Content</p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Violence and threats</li>
                <li>Harassment and bullying</li>
                <li>Sexual content and nudity</li>
                <li>Youth endangerment</li>
                <li>Illegal activities</li>
                <li>Privacy violations</li>
                <li>Copyright violations</li>
                <li>Terrorism or violent extremism</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Creator Responsibilities</p>
              <p className="text-gray-600">Follow the moderation policy and review moderation guidelines before streaming sensitive topics.</p>
              <p className="text-gray-600">Contact legal@Whale.fun.com for appeals.</p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <button
              className="h-10 px-4 rounded-xl bg-black text-white font-medium hover:bg-black/90"
              onClick={() => {
                setAcceptedTerms(true);
                setShowTerms(false);
                setShowPreview(true);
              }}
            >
              I agree
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stream Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Stream preview</DialogTitle>
            <DialogDescription>Choose your video/audio preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs opacity-70">Whale.fun broadcast mode</label>
              <select className="w-full rounded border px-3 py-2">
                <option value="webcam">Webcam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs opacity-70">Video/audio inputs</label>
              <div className="grid grid-cols-1 gap-2">
                <select className="w-full rounded border px-3 py-2"><option>Default Camera</option></select>
                <select className="w-full rounded border px-3 py-2"><option>Default Microphone</option></select>
              </div>
            </div>
            <div>
              <label className="block text-xs opacity-70">Stream title (optional)</label>
              <Input placeholder="Enter a descriptive title..." value={glDesc} onChange={(e)=>setGlDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowPreview(false); setShowChat(true); }}>Next</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Options Modal */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Chat options</DialogTitle>
            <DialogDescription>Configure your chat before going live</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
              <div>
                <div className="font-medium">Token-gated chat</div>
                <div className="text-xs text-gray-500">Only token holders can chat</div>
              </div>
              <button
                type="button"
                onClick={() => setChatAllowed((v) => !v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  chatAllowed ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {chatAllowed ? "On" : "Off"}
              </button>
            </label>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              try {
                if (glCam || glMic) {
                  const perm = await navigator.mediaDevices.getUserMedia({ video: glCam, audio: glMic });
                  // Immediately stop permission stream to avoid dangling devices
                  try { perm.getTracks().forEach((t) => t.stop()); } catch {}
                }
                setPermissionsGranted(true);
                setShowChat(false);
                // Create Huddle room and token so StreamPlayer can join/publish inline
                const res = await fetch("/api/huddle01/room", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: glTitle, description: glDesc }),
                });
                const roomData = await res.json();
                if (!res.ok || roomData?.error || !roomData?.roomId) throw new Error(roomData?.error || "Failed to create room");
                const newRoomId = roomData.roomId as string;
                setRoomId(newRoomId);
                const tres = await fetch("/api/huddle01/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ roomId: newRoomId, userId: glUser || undefined }),
                });
                const tdata = await tres.json();
                if (!tres.ok || tdata?.error || !tdata?.token) throw new Error(tdata?.error || "Failed to generate token");
                setHuddleToken(tdata.token as string);
              } catch (e: any) {
                alert(e?.message || "Permission or setup failed. Please try again.");
              }
            }}>Go live</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradePage;
