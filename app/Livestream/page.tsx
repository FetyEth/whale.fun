"use client";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import StreamPlayer from "@/components/StreamPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Copy } from "lucide-react";

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

const Livestream = () => {
  const [selectedToken, setSelectedToken] = useState<"WHALE" | "ARROW">("WHALE");
  const [bossOpen, setBossOpen] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  // Modal flow
  const [showSetup, setShowSetup] = useState(true);
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
  useEffect(() => {
    // Start on Setup; after continue, show Terms
    setShowSetup(true);
  }, []);

  const persistTerms = (v: boolean) => {
    setAcceptedTerms(v);
  };
  // Trade panel state
  const [tradeMode, setTradeMode] = useState<"Buy" | "Sell">("Buy");
  const [tradeToken, setTradeToken] = useState<"ART" | "0G">("ART");
  const [amount, setAmount] = useState<string>("");
  const [balances, setBalances] = useState<Record<string, number>>({ "0G": 42.23, ART: 0 });
  const activeBalance = balances[tradeToken];
  const parsedAmount = Number(amount || 0);
  // Huddle identifiers for inline publish/recording
  const [roomId, setRoomId] = useState<string>("");
  const [huddleToken, setHuddleToken] = useState<string>("");
  // UI: copy feedback
  const [copied, setCopied] = useState(false);
  const displayAddress = "0xe62...09A0";
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="px-6 md:px-10 lg:px-16 xl:px-24 py-6 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile card + Video */}
          <div className="lg:col-span-2 space-y-4">
            {/* Streamer header */}
            <Card className="border-gray-200">
              <CardContent className="p-5 md:p-6 flex gap-4 items-center">
                <div className="h-12 w-12 rounded-xl bg-gray-100 border border-[#0000001A] overflow-hidden">
                  <Avatar className="h-full w-full rounded-xl">
                    <AvatarImage src="/placeholder-user.jpg" alt="Streamer" />
                    <AvatarFallback>TN</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900 truncate">{glTitle}</h1>
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-sm">
                    <span className="font-bold text-gray-900">TN</span>
                    <span className="px-2 py-0.5 rounded-full border border-[#0000001A] text-gray-800 bg-white">offchain</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEFEF] text-gray-800 border cursor-pointer"
                      style={{ borderColor: '#0000001A' }}
                      onClick={handleCopy}
                      title="Copy address"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="font-mono text-sm">{displayAddress}</span>
                    </button>
                    {copied && (
                      <span className="text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">Copied!</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video player (shown after permissions) */}
            {permissionsGranted ? (
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
            ) : (
              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-8 text-center text-gray-500">
                  Complete setup to start the stream preview
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-3">
            {/* Terms Gate as modal handled below */}
            {/* Boss Battle card */}
            {acceptedTerms && (
            <Card className="border-gray-200 mt-0">
              <CardHeader className="">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span>
                        <img src="/icons/trophy.svg" alt="trophy" width={24} height={24} />
                    </span>
                    <span className="text-[18px] font-semibold">Boss Battle</span>
                    <span className="text-red-500">• Live</span>
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

                <div>
                  {!bossOpen ? (
                    <p className="text-sm text-gray-600 mb-2">Select your chosen token</p>
                  ) : selectedToken ? (
                    <p className="text-sm text-gray-600 mb-2">
                      you have selected <span className="font-semibold">{selectedToken}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mb-2">Select your chosen token</p>
                  )}
                  {bossOpen && (
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
                  )}
                </div>

                {bossOpen && (
                  <div className="space-y-3">
                    <Input type="number" placeholder="Amount (ETH)" className="h-11 bg-[#E5E5E566]" />
                    <Button className="w-full h-11 rounded-xl font-semibold cursor-pointer">
                      {`Stake & Vote ${selectedToken}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Live Chat */}
            {acceptedTerms && chatAllowed && (
            <>
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
            <Card className="border-gray-200 mt-6">
              <CardContent className="p-4 md:p-6 space-y-6">
                {/* Tabs container */}
                <div className="p-1 flex gap-2" style={{ borderColor: '#0000001A' }}>
                  <button
                    onClick={() => setTradeMode("Buy")}
                    className={`flex-1 px-6 py-3 rounded-2xl font-semibold ${
                      tradeMode === "Buy" ? "bg-[#B65FFF] text-white" : "bg-[#F2F2F2] text-gray-700 border"
                    }`}
                    style={tradeMode === "Buy" ? undefined : { borderColor: '#0000001A' }}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeMode("Sell")}
                    className={`flex-1 px-6 py-3 rounded-2xl font-semibold ${
                      tradeMode === "Sell" ? "bg-[#B65FFF] text-white" : "bg-[#F2F2F2] text-gray-700 border"
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
                    className="px-5 py-2 rounded-full bg-[#EFEFEF] text-gray-800 border"
                    style={{ borderColor: '#0000001A' }}
                  >
                    {tradeToken === "ART" ? "Switch to 0G" : "Switch to ART"}
                  </button>
                  <button
                    onClick={() => setAmount(String(activeBalance))}
                    className="px-5 py-2 rounded-full bg-[#EFEFEF] text-gray-800 border"
                    style={{ borderColor: '#0000001A' }}
                  >
                    Set max to slippage
                  </button>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold text-gray-900">Balance:</div>
                  <div className="text-2xl font-semibold text-gray-400">{activeBalance} {tradeToken}</div>
                </div>

                {/* Amount field */}
                <div className="border rounded-xl px-4 py-3 flex items-center justify-between bg-white" style={{ borderColor: '#0000001A' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent outline-none text-2xl font-medium placeholder:text-gray-400"
                  />
                  <img src="/icons/0G-logo.svg" alt="token" width={28} height={28} className="ml-3" />
                </div>

                {/* Preset chips */}
                <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                  <button
                    onClick={() => setAmount("")}
                    className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                    style={{ borderColor: '#0000001A' }}
                  >
                    Reset
                  </button>
                  {[
                    0.10,
                    0.5,
                    10,
                  ].map((val, i) => (
                    <button
                      key={i}
                      onClick={() => setAmount(String(val))}
                      className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                      style={{ borderColor: '#0000001A' }}
                    >
                      {val} {tradeToken}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(String(activeBalance))}
                    className="px-3 py-1 rounded-full bg-white text-gray-800 border shadow-sm text-sm"
                    style={{ borderColor: '#0000001A' }}
                  >
                    Max
                  </button>
                </div>

                {/* Primary action */}
                <Button
                  disabled={!amount || parsedAmount <= 0}
                  className={`w-full h-12 rounded-2xl text-lg font-semibold text-white ${
                    !amount || parsedAmount <= 0 ? "bg-black/60 cursor-not-allowed" : "bg-black"
                  }`}
                >
                  {tradeMode} {tradeToken}
                </Button>
              </CardContent>
            </Card>
            </>
            )}
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
                persistTerms(true);
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
  )
}

export default Livestream;