"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TokenFactoryService } from "@/config/services/core/TokenFactoryService";
import { TradingEngineService } from "@/config/services/core/TradingEngineService";
import { uploadFileToPinata } from "@/lib/services/pintoIPFS";
// Terms dialog is handled on the live room page

type ApiResponse<T = any> = {
  success?: boolean;
  error?: string;
} & T;

type CreateRoomResponse = ApiResponse<{
  roomId?: string;
  meetingLink?: string;
}>;

type TokenResponse = ApiResponse<{
  token?: string;
  roomId?: string;
}>;

export default function StudioPage() {
  const router = useRouter();
  const [title, setTitle] = useState("default room");
  const [description, setDescription] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(1); // legacy stepper (kept for now)
  const [creating, setCreating] = useState(false);
  const [gettingToken, setGettingToken] = useState(false);
  // T&C now handled on the live room page

  const [recording, setRecording] = useState(false);
  const [livestreaming, setLivestreaming] = useState(false);
  // In-app AV preview state
  const [joinedPreview, setJoinedPreview] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // In-page meeting iframe
  const [inPageJoin, setInPageJoin] = useState(false);

  // RTMP config
  const [rtmpUrlsText, setRtmpUrlsText] = useState<string>("");
  const rtmpUrls = useMemo(
    () =>
      rtmpUrlsText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean),
    [rtmpUrlsText]
  );

  // On-chain panels state
  const [creatorAddress, setCreatorAddress] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [creatorMetrics, setCreatorMetrics] = useState<any | null>(null);
  const [platformMetrics, setPlatformMetrics] = useState<any | null>(null);
  const [fees, setFees] = useState<any | null>(null);
  const [dynamicFeeBp, setDynamicFeeBp] = useState<string>("");
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [sellAmount, setSellAmount] = useState<string>("");
  const [tradeStatus, setTradeStatus] = useState<string>("");
  // Recording history
  const [recordings, setRecordings] = useState<Array<{ url: string; size?: number; ts: number }>>([]);

  // Token design & voting
  const [nameOptions, setNameOptions] = useState<string[]>(["WhaleX", "AquaCoin", "StreamToken"]);
  const [symbolOptions, setSymbolOptions] = useState<string[]>(["WHLX", "AQUA", "STRM"]);
  const [selectedName, setSelectedName] = useState<string>(nameOptions[0]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbolOptions[0]);
  const [supply, setSupply] = useState<number>(1_000_000);
  const [creatorFee, setCreatorFee] = useState<number>(95); // 0.95%
  const [logoCid, setLogoCid] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  // Q&A with sentiment
  const [question, setQuestion] = useState<string>("");
  const [qa, setQa] = useState<Array<{ q: string; ts: number; sentiment: number }>>([]);

  // Invite generation state
  const [inviteeName, setInviteeName] = useState<string>("");
  const [inviteToken, setInviteToken] = useState<string>("");
  // Step 3 layout toggles to declutter the live workspace
  const [showDesign, setShowDesign] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showQA, setShowQA] = useState(false);

  // Monaco editor state
  const monacoDivRef = useRef<HTMLDivElement | null>(null);
  const monacoEditorRef = useRef<any>(null);
  const [monacoReady, setMonacoReady] = useState(false);

  const canControl = !!roomId;
  const computedMeetingLink = useMemo(() => {
    if (meetingLink) return meetingLink;
    if (!roomId) return "";
    // Primary fallback used by many rooms
    return `https://app.huddle01.com/room/${roomId}`;
  }, [meetingLink, roomId]);

  const hostJoinUrl = useMemo(() => {
    if (!computedMeetingLink || !token) return "";
    const sep = computedMeetingLink.includes("?") ? "&" : "?";
    return `${computedMeetingLink}${sep}token=${encodeURIComponent(token)}`;
  }, [computedMeetingLink, token]);

  const createRoom = useCallback(async () => {
    try {
      if (!title.trim()) {
        alert("Please enter a room title");
        return;
      }
      setCreating(true);
      const res = await fetch("/api/huddle01/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data: CreateRoomResponse = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to create room");
      }
      if (data.roomId) setRoomId(data.roomId);
      if ((data as any).meetingLink) setMeetingLink((data as any).meetingLink);
      setCurrentStep(2);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  }, [title, description]);

  const getAccessToken = useCallback(async () => {
    try {
      if (!roomId) {
        alert("Create or enter a roomId first");
        return;
      }
      setGettingToken(true);
      const res = await fetch("/api/huddle01/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId: userId || undefined }),
      });
      const data: TokenResponse = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to generate token");
      }
      if (data.token) setToken(data.token);
      setCurrentStep(3);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to get token");
    } finally {
      setGettingToken(false);
    }
  }, [roomId, userId]);

  // New single action: create room -> token -> redirect to stream page
  const handleCreateAndGo = useCallback(async () => {
    try {
      // Create room
      setCreating(true);
      const res = await fetch("/api/huddle01/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const roomData: CreateRoomResponse = await res.json();
      if (!res.ok || roomData?.error || !roomData?.roomId) {
        throw new Error(roomData?.error || "Failed to create room");
      }
      const newRoomId = roomData.roomId;
      setRoomId(newRoomId);
      const link = (roomData as any).meetingLink || `https://app.huddle01.com/room/${newRoomId}`;
      setMeetingLink(link);

      // Generate token
      const tres = await fetch("/api/huddle01/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: newRoomId, userId: userId || undefined }),
      });
      const tdata: TokenResponse = await tres.json();
      if (!tres.ok || tdata?.error || !tdata?.token) {
        throw new Error(tdata?.error || "Failed to generate token");
      }
      const tok = tdata.token;
      setToken(tok);

      // Redirect to stream page with token
      router.push(`/studio/room/${encodeURIComponent(newRoomId)}?token=${encodeURIComponent(tok)}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to start studio");
    } finally {
      setCreating(false);
    }
  }, [title, description, userId, router]);

  // Generate a member token to share with others
  const generateMemberInvite = useCallback(async () => {
    try {
      if (!roomId) return alert("Create a room first");
      if (!inviteeName.trim()) return alert("Enter invitee name or ID");
      const res = await fetch("/api/huddle01/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId: inviteeName.trim(), role: "guest" }),
      });
      const data: TokenResponse = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate invite token");
      if (data.token) setInviteToken(data.token);
    } catch (e: any) {
      alert(e?.message || "Failed to generate invite");
    }
  }, [roomId, inviteeName]);

  const startRecording = useCallback(async () => {
    try {
      if (!roomId) return alert("No roomId");
      const res = await fetch("/api/recording/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed");
      setRecording(true);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to start recording");
    }
  }, [roomId]);

  const stopRecording = useCallback(async () => {
    try {
      if (!roomId) return alert("No roomId");
      const res = await fetch("/api/recording/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed");
      setRecording(false);
      if (data?.recordingUrl) {
        setRecordings((prev) => [{ url: data.recordingUrl as string, size: data?.recordingSize, ts: Date.now() }, ...prev]);
        if (confirm("Recording stopped. Open recording URL?")) window.open(data.recordingUrl, "_blank");
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to stop recording");
    }
  }, [roomId]);

  const startLivestream = useCallback(async () => {
    try {
      if (!roomId) return alert("No roomId");
      const body: any = { roomId };
      if (rtmpUrls.length > 0) body.rtmpUrls = rtmpUrls;

      const res = await fetch("/api/livestream/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed");
      setLivestreaming(true);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to start livestream");
    }
  }, [roomId, rtmpUrls]);

  const stopLivestream = useCallback(async () => {
    try {
      if (!roomId) return alert("No roomId");
      const res = await fetch("/api/livestream/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed");
      setLivestreaming(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to stop livestream");
    }
  }, [roomId]);

  // =============== On-chain panels ===============
  const loadCreatorMetrics = useCallback(async () => {
    try {
      if (!creatorAddress) return alert("Enter a creator address");
      const svc = new TokenFactoryService();
      const data = await svc.getCreatorMetrics(creatorAddress, 84532);
      setCreatorMetrics(data);
    } catch (e: any) {
      alert(e?.message || "Failed to load creator metrics");
    }
  }, [creatorAddress]);

  const loadPlatformMetrics = useCallback(async () => {
    try {
      const svc = new TokenFactoryService();
      const data = await svc.getPlatformMetrics(84532);
      setPlatformMetrics(data);
    } catch (e: any) {
      alert(e?.message || "Failed to load platform metrics");
    }
  }, []);

  const loadFees = useCallback(async () => {
    try {
      const svc = new TradingEngineService();
      const data = await svc.getFees(84532);
      setFees(data);
    } catch (e: any) {
      alert(e?.message || "Failed to load fees");
    }
  }, []);

  const calcDynamicFee = useCallback(async () => {
    try {
      if (!tokenAddress) return alert("Enter token address");
      const svc = new TradingEngineService();
      const feeWei = await svc.calculateDynamicFee(tokenAddress, 84532);
      setDynamicFeeBp(((Number(feeWei) / 100).toFixed(2)).toString());
    } catch (e: any) {
      alert(e?.message || "Failed to calculate fee");
    }
  }, [tokenAddress]);

  const buyToken = useCallback(async () => {
    try {
      if (!tokenAddress || !buyAmount) return alert("Token address and amount required");
      setTradeStatus("Buying...");
      const svc = new TradingEngineService();
      // simplified: trade tokenIn (WHALE) -> tokenOut (tokenAddress) or vice-versa; here assume buying token with WHALE
      const tx = await svc.trade(
        "0x496468bc6ffd9839bd5ab05f54142ed4883f7745",
        tokenAddress,
        BigInt(Math.floor(Number(buyAmount) * 1e18)),
        BigInt(0),
        {},
        84532
      );
      setTradeStatus(`Submitted: ${tx.hash}`);
    } catch (e: any) {
      setTradeStatus("");
      alert(e?.message || "Trade failed");
    }
  }, [tokenAddress, buyAmount]);

  const sellToken = useCallback(async () => {
    try {
      if (!tokenAddress || !sellAmount) return alert("Token address and amount required");
      setTradeStatus("Selling...");
      const svc = new TradingEngineService();
      const tx = await svc.trade(
        tokenAddress,
        "0x496468bc6ffd9839bd5ab05f54142ed4883f7745",
        BigInt(Math.floor(Number(sellAmount) * 1e18)),
        BigInt(0),
        {},
        84532
      );
      setTradeStatus(`Submitted: ${tx.hash}`);
    } catch (e: any) {
      setTradeStatus("");
      alert(e?.message || "Trade failed");
    }
  }, [tokenAddress, sellAmount]);

  // Request camera/mic permissions for Huddle
  const requestAVPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      alert("Camera/Mic access granted");
    } catch (e: any) {
      alert(e?.message || "Failed to get camera/mic. Check browser permissions.");
    }
  }, []);

  // Drag & drop logo upload
  const onDropLogo = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const res = await uploadFileToPinata(file);
      const cid = res?.IpfsHash;
      if (cid) setLogoCid(cid);
    } catch (err: any) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  // Q&A with basic sentiment
  const analyzeSentiment = (text: string): number => {
    const positive = ["good", "great", "love", "bullish", "nice", "awesome", "win"];
    const negative = ["bad", "hate", "bearish", "terrible", "ugly", "scam"];
    let score = 0;
    const t = text.toLowerCase();
    positive.forEach((w) => (score += t.includes(w) ? 1 : 0));
    negative.forEach((w) => (score -= t.includes(w) ? 1 : 0));
    return score; // -n..+n
  };

  // Persist Q&A to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("studio_qa");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQa(parsed);
      }
    } catch {}
  }, []);

  // Load recording history
  useEffect(() => {
    try {
      const raw = localStorage.getItem("studio_recordings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecordings(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("studio_qa", JSON.stringify(qa));
    } catch {}
  }, [qa]);

  // Persist recording history
  useEffect(() => {
    try {
      localStorage.setItem("studio_recordings", JSON.stringify(recordings));
    } catch {}
  }, [recordings]);

  // Build contract code from current selections
  const contractCode = useMemo(() => {
    return `// Token Template (editable)\ncontract CreatorToken {\n  string public name = "${selectedName}";\n  string public symbol = "${selectedSymbol}";\n  uint256 public totalSupply = ${supply} * 1e18;\n  uint256 public creatorFeeBps = ${creatorFee}; // 0.95% ≈ 95 bps\n  string public logo = "ipfs://${logoCid || ""}";\n  // ...\n}`;
  }, [selectedName, selectedSymbol, supply, creatorFee, logoCid]);

  // Load Monaco via CDN and init
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (monacoReady) return;
    if ((window as any).monaco) {
      setMonacoReady(true);
      return;
    }
    if (document.getElementById("monaco-loader")) return; // avoid duplicate
    const script = document.createElement("script");
    script.id = "monaco-loader";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs/loader.min.js";
    script.onload = () => {
      const w: any = window as any;
      if (!w.require) return;
      w.require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });
      w.require(["vs/editor/editor.main"], () => {
        setMonacoReady(true);
      });
    };
    document.body.appendChild(script);
  }, [monacoReady]);

  // Initialize editor when ready
  useEffect(() => {
    if (!monacoReady) return;
    if (!monacoDivRef.current) return;
    const w: any = window as any;
    if (!w.monaco) return;
    if (monacoEditorRef.current) return;
    try {
      monacoEditorRef.current = w.monaco.editor.create(monacoDivRef.current, {
        value: contractCode,
        language: "solidity",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
      });
    } catch {
      try {
        monacoEditorRef.current = w.monaco.editor.create(monacoDivRef.current, {
          value: contractCode,
          language: "javascript",
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: false },
        });
      } catch {}
    }
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, [monacoReady]);

  // Sync code into editor when parameters change
  useEffect(() => {
    if (monacoEditorRef.current) {
      try {
        monacoEditorRef.current.setValue(contractCode);
      } catch {}
    }
  }, [contractCode]);

  // In-app AV: attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      try {
        videoRef.current.srcObject = localStream;
      } catch {}
    }
  }, [localStream]);

  const joinPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
      setMicEnabled(true);
      setCamEnabled(true);
      setJoinedPreview(true);
    } catch (e: any) {
      alert(e?.message || "Failed to access camera/mic");
    }
  }, []);

  const leavePreview = useCallback(() => {
    try {
      localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    setLocalStream(null);
    setJoinedPreview(false);
  }, [localStream]);

  const toggleMic = useCallback(() => {
    const tracks = localStream?.getAudioTracks() || [];
    const next = !micEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setMicEnabled(next);
  }, [localStream, micEnabled]);

  const toggleCam = useCallback(() => {
    const tracks = localStream?.getVideoTracks() || [];
    const next = !camEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setCamEnabled(next);
  }, [localStream, camEnabled]);

  // Simple reputation scoring from creator metrics
  const reputationScore = useMemo(() => {
    if (!creatorMetrics) return null;
    try {
      const totalTokensCreated = Number(creatorMetrics.totalTokensCreated ?? 0);
      const totalVolumeGenerated = Number(creatorMetrics.totalVolumeGenerated ?? 0);
      const totalFeesEarned = Number(creatorMetrics.totalFeesEarned ?? 0);
      const successRate = Number(creatorMetrics.successRate ?? 0);
      // Normalize and combine (lightweight heuristic)
      const score =
        Math.min(100, totalTokensCreated * 5) +
        Math.min(100, Math.log10(totalVolumeGenerated + 1) * 20) +
        Math.min(100, Math.log10(totalFeesEarned + 1) * 20) +
        Math.min(100, successRate / 1e16); // assuming successRate is scaled
      return Math.round(Math.min(100, score / 4));
    } catch {
      return null;
    }
  }, [creatorMetrics]);

  const askQuestion = () => {
    if (!question.trim()) return;
    const s = analyzeSentiment(question);
    setQa((prev) => [{ q: question.trim(), ts: Date.now(), sentiment: s }, ...prev]);
    setQuestion("");
  };

  const steps = [
    { id: 1, label: "Room" },
    { id: 2, label: "Join Token" },
    { id: 3, label: "Record/Livestream" },
    { id: 4, label: "Token Design" },
    { id: 5, label: "On-chain Metrics & Trading" },
    { id: 6, label: "Q&A & Support" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Creator Studio</h1>
        <p className="text-sm text-gray-500">Create your room and go live with Whale.fun.</p>
      </header>

      <section className="rounded-lg border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="default room"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="Describe your stream"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">User name</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Whale token"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCreateAndGo}
            disabled={creating}
            className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
          >
            {creating ? "Starting..." : "Create room"}
          </button>
        </div>
      </section>

      {/* Sticky Live Header (Step 3 only) */}
      {currentStep === 3 && (
        <div className="sticky top-0 z-10 -mt-2 mb-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border rounded p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">Room:</span>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{roomId || "—"}</code>
          {meetingLink && (
            <button onClick={() => window.open(meetingLink, "_blank")} className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">Open Meeting</button>
          )}
          <button onClick={() => navigator.clipboard.writeText(roomId || "")} className="text-xs px-2 py-1 rounded bg-gray-800 text-white disabled:opacity-50" disabled={!roomId}>Copy Room ID</button>
          {meetingLink && (
            <button onClick={() => navigator.clipboard.writeText(meetingLink)} className="text-xs px-2 py-1 rounded bg-gray-800 text-white">Copy Link</button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-[11px] px-2 py-1 rounded ${recording ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>● Recording {recording ? "ON" : "OFF"}</span>
            <span className={`text-[11px] px-2 py-1 rounded ${livestreaming ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"}`}>● Live {livestreaming ? "ON" : "OFF"}</span>
          </div>
          <div className="w-full md:w-auto md:ml-2 flex items-center gap-2">
            <button onClick={() => setShowDesign((v) => !v)} className={`text-xs px-2 py-1 rounded ${showDesign ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>Design</button>
            <button onClick={() => setShowMetrics((v) => !v)} className={`text-xs px-2 py-1 rounded ${showMetrics ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>Metrics</button>
            <button onClick={() => setShowQA((v) => !v)} className={`text-xs px-2 py-1 rounded ${showQA ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>Q&A</button>
          </div>
        </div>
      )}

      {/* In-app Video Panel (local preview) */}
      {currentStep === 3 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Video Panel</h2>
            <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center relative">
              {inPageJoin && meetingLink ? (
                <iframe
                  src={`${meetingLink}${token ? (meetingLink.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token) : ""}`}
                  className="w-full h-full"
                  allow="camera; microphone; clipboard-read; clipboard-write; display-capture;"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {!joinedPreview && (
                    <span className="text-xs text-gray-400 absolute">Not joined</span>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!inPageJoin && (
                !joinedPreview ? (
                  <button onClick={joinPreview} className="px-4 py-2 rounded bg-emerald-600 text-white">Join Preview</button>
                ) : (
                  <button onClick={leavePreview} className="px-4 py-2 rounded bg-red-600 text-white">Leave Preview</button>
                )
              )}
              <button onClick={toggleMic} disabled={!joinedPreview || inPageJoin} className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50">
                {micEnabled ? "Mic Off" : "Mic On"}
              </button>
              <button onClick={toggleCam} disabled={!joinedPreview || inPageJoin} className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50">
                {camEnabled ? "Video Off" : "Video On"}
              </button>
              {meetingLink && (
                <button onClick={() => window.open(meetingLink, "_blank")} className="px-4 py-2 rounded bg-indigo-600 text-white">Open Meeting</button>
              )}
              {meetingLink && (
                !inPageJoin ? (
                  <button onClick={() => setInPageJoin(true)} className="px-4 py-2 rounded bg-purple-600 text-white">Join In-Page</button>
                ) : (
                  <button onClick={() => setInPageJoin(false)} className="px-4 py-2 rounded bg-gray-600 text-white">Leave In-Page</button>
                )
              )}
            </div>
            <p className="text-xs text-gray-500">This is a local preview. Use &quot;Open Meeting&quot; to join the actual Huddle room; keep this preview to test mic/video before going live.</p>
          </div>
        </section>
      )}

      {/* Step 3: Record/Livestream (gated after token). When on Step 3, also render optional Token Design, Metrics & Trading, and Q&A below. */}
      {currentStep === 3 && (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">Recording {recording ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">ON</span> : <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">OFF</span>}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startRecording}
              disabled={!canControl || recording}
              className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
            >
              Start Recording
            </button>
            <button
              onClick={requestAVPermission}
              className="px-4 py-2 rounded bg-gray-700 text-white"
            >
              Grant Camera/Mic
            </button>
            <button
              onClick={stopRecording}
              disabled={!canControl || !recording}
              className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
            >
              Stop Recording
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Recorder bot will join your room and record the session.
          </p>
          {/* Recording history */}
          {recordings.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold">Recordings</h3>
              <ul className="text-xs space-y-1 max-h-28 overflow-auto">
                {recordings.map((r, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {new Date(r.ts).toLocaleString()} • {r.size ? `${r.size} bytes` : "size unknown"}
                    </span>
                    <a className="text-blue-600 underline" href={r.url} target="_blank">Open</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">Livestream {livestreaming ? <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded">ON</span> : <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">OFF</span>}</h2>
          <label className="block text-sm font-medium">
            RTMP URLs (comma or newline separated)
          </label>
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="rtmp://.../key\nrtmp://.../key"
            value={rtmpUrlsText}
            onChange={(e) => setRtmpUrlsText(e.target.value)}
            rows={4}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={startLivestream}
              disabled={!canControl || livestreaming}
              className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
            >
              Start Livestream
            </button>
            <button
              onClick={stopLivestream}
              disabled={!canControl || !livestreaming}
              className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
            >
              Stop Livestream
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Leave blank to use server defaults from env variables.
          </p>
          <p className="text-xs text-amber-700 mt-2">Tip: Start/Stop livestream after the host joins the room in Huddle.</p>
        </div>
      </section>
      )}

      {/* Step 5: On-Chain Metrics and Trading (also visible in Step 3, collapsed by default) */}
      {(currentStep === 5 || (currentStep === 3 && showMetrics)) && (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Creator & Platform Metrics</h2>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Creator address (0x...)"
              value={creatorAddress}
              onChange={(e) => setCreatorAddress(e.target.value)}
            />
            <button onClick={loadCreatorMetrics} className="px-3 py-2 rounded bg-gray-800 text-white">
              Load Creator
            </button>
            <button onClick={loadPlatformMetrics} className="px-3 py-2 rounded bg-gray-600 text-white">
              Load Platform
            </button>
          </div>
          {creatorMetrics && (
            <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(creatorMetrics, null, 2)}</pre>
          )}
          {platformMetrics && (
            <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(platformMetrics, null, 2)}</pre>
          )}
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Fees & Trading</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadFees} className="px-3 py-2 rounded bg-gray-800 text-white">
              Load Fee Structure
            </button>
          </div>
          {fees && (
            <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(fees, null, 2)}</pre>
          )}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Token address (for dynamic fee/trade)"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
            <button onClick={calcDynamicFee} className="px-3 py-2 rounded bg-indigo-600 text-white">
              Dynamic Fee
            </button>
            {dynamicFeeBp && <span className="text-xs text-gray-700">{dynamicFeeBp} bps</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded border px-3 py-2"
                placeholder="Buy amount (tokenIn 1e18)"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
              />
              <button onClick={buyToken} className="px-3 py-2 rounded bg-emerald-600 text-white">Buy</button>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded border px-3 py-2"
                placeholder="Sell amount (tokenIn 1e18)"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
              />
              <button onClick={sellToken} className="px-3 py-2 rounded bg-red-600 text-white">Sell</button>
            </div>
          </div>
          {tradeStatus && <p className="text-xs text-gray-600">{tradeStatus}</p>}
          {currentStep === 5 && (
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 rounded bg-black text-white"
              >
                Next: Q&A & Support
              </button>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Step 4: Token Design & Voting (also visible in Step 3, collapsed by default) */}
      {(currentStep === 4 || (currentStep === 3 && showDesign)) && (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Token Design Voting</h2>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {nameOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedName(n)}
                  className={`px-3 py-1 rounded border ${selectedName === n ? "bg-blue-600 text-white" : "bg-white"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Symbol</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {symbolOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSymbol(s)}
                  className={`px-3 py-1 rounded border ${selectedSymbol === s ? "bg-blue-600 text-white" : "bg-white"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Total Supply</label>
              <input
                type="number"
                className="w-full rounded border px-3 py-2"
                value={supply}
                onChange={(e) => setSupply(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Creator Fee (bps)</label>
              <input
                type="number"
                className="w-full rounded border px-3 py-2"
                value={creatorFee}
                onChange={(e) => setCreatorFee(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">0.95% ~ 95 bps (Pump.fun style)</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Logo (Drag & Drop)</label>
            <div
              onDrop={onDropLogo}
              onDragOver={onDragOver}
              className="border-dashed border-2 rounded p-6 text-center text-sm text-gray-500"
            >
              {uploadingLogo ? "Uploading..." : "Drop an image here"}
            </div>
            {logoCid && (
              <div className="mt-2 text-xs">
                <p className="text-green-700">Pinned to IPFS</p>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${logoCid}`}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  View Logo
                </a>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Selected: {selectedName} ({selectedSymbol}) • Supply: {supply} • Creator Fee: {creatorFee} bps
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Contract Visualization</h2>
          <p className="text-xs text-gray-500">Live editable contract snippet (Monaco).</p>
          <div ref={monacoDivRef} style={{ height: 300 }} className="rounded overflow-hidden border" />
          {currentStep === 4 && (
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded bg-black text-white"
              >
                Next: On-chain Metrics
              </button>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Step 6: Q&A with Sentiment and Support (also visible in Step 3, collapsed by default) */}
      {(currentStep === 6 || (currentStep === 3 && showQA)) && (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Live Q&A</h2>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button onClick={askQuestion} className="px-3 py-2 rounded bg-gray-800 text-white">Ask</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-auto">
            {qa.map((item, i) => (
              <div key={i} className="text-sm border rounded p-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{new Date(item.ts).toLocaleTimeString()}</span>
                  <span>Sentiment: {item.sentiment > 0 ? "+" : ""}{item.sentiment}</span>
                </div>
                <div>{item.q}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">24/7 Creator Support</h2>
          <p className="text-sm text-gray-600">Need help during a session? Send a support ping.</p>
          <button
            onClick={async () => {
              await fetch("/api/support", { method: "POST" });
              alert("Support request sent");
            }}
            className="px-4 py-2 rounded bg-purple-700 text-white"
          >
            Request Support
          </button>
        </div>
      </section>
      )}
    </div>
  );
}
