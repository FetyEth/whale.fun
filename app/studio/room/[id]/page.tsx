"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Mic, MicOff, Video as VideoIcon, VideoOff, CircleDot, Square } from "lucide-react";

export default function RoomLivePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const roomId = params?.id || "";
  const token = search?.get("token") || "";

  // Use global Huddle room URL so iframe fallback works (may require allowlisting domains)
  const meetingUrl = useMemo(() => {
    if (!roomId) return "";
    const base = `https://app.huddle01.com/room/${encodeURIComponent(roomId)}`;
    if (!token) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}token=${encodeURIComponent(token)}`;
  }, [roomId, token]);

  // Modal flow: terms -> preview -> chat
  const [termsOpen, setTermsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tokenHoldersOnly, setTokenHoldersOnly] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const playAttemptsRef = useRef<number>(0);
  const [recording, setRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingWarning, setRecordingWarning] = useState<string>("");
  // Livestream removed per latest request
  // Treat this page user as host so they can always chat
  const isHost = true;

  // Local media preview as background
  const [mediaError, setMediaError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(true);

  // Enumerate devices once
  useEffect(() => {
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const vids = list.filter((d) => d.kind === "videoinput");
        const auds = list.filter((d) => d.kind === "audioinput");
        setVideoDevices(vids);
        setAudioDevices(auds);
        if (!selectedVideoId && vids[0]?.deviceId) setSelectedVideoId(vids[0].deviceId);
        if (!selectedAudioId && auds[0]?.deviceId) setSelectedAudioId(auds[0].deviceId);
      } catch (e: any) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore persisted AV state
  useEffect(() => {
    try {
      const m = localStorage.getItem("whale_mic_on");
      const c = localStorage.getItem("whale_cam_on");
      const mir = localStorage.getItem("whale_mirror");
      if (m != null) setMicOn(m === "1");
      if (c != null) setCamOn(c === "1");
      if (mir != null) setMirror(mir === "1");
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("whale_mic_on", micOn ? "1" : "0"); } catch {} }, [micOn]);
  useEffect(() => { try { localStorage.setItem("whale_cam_on", camOn ? "1" : "0"); } catch {} }, [camOn]);
  useEffect(() => { try { localStorage.setItem("whale_mirror", mirror ? "1" : "0"); } catch {} }, [mirror]);

  // Manage camera stream (intentionally excludes 'stream' to avoid re-acquire loops)
  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;
    (async () => {
      try {
        if (!camOn) {
          try { stream?.getVideoTracks().forEach((t) => t.stop()); } catch {}
          if (videoRef.current) {
            try { (videoRef.current as any).srcObject = null; } catch {}
            try { (videoRef.current as HTMLVideoElement).pause(); } catch {}
          }
          return;
        }
        const constraints: MediaStreamConstraints = { video: selectedVideoId ? { deviceId: { exact: selectedVideoId } as any } : { facingMode: "user" }, audio: false } as any;
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) { try { s.getTracks().forEach((t) => t.stop()); } catch {}; return; }
        localStream = s;
        setStream(s);
        if (videoRef.current) {
          try { (videoRef.current as any).srcObject = s; } catch {}
          try {
            const v = videoRef.current as HTMLVideoElement;
            v.onloadedmetadata = async () => { try { await v.play(); } catch {} };
            await v.play();
          } catch {}
        }
      } catch (e: any) {
        setMediaError(e?.message || "Failed to access camera");
      }
    })();
    return () => {
      active = false;
      try { localStream?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn, selectedVideoId]);

  // Bootstrap: ensure camera is ON initially even if device list arrives slightly later
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (!camOn) return;
        if (stream && stream.getVideoTracks().length > 0) return;
        const constraints: MediaStreamConstraints = { video: selectedVideoId ? { deviceId: { exact: selectedVideoId } as any } : { facingMode: "user" }, audio: false } as any;
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(s);
        if (videoRef.current) {
          try { (videoRef.current as any).srcObject = s; } catch {}
          try { await (videoRef.current as HTMLVideoElement).play(); } catch {}
        }
      } catch {}
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen bg-black">
      {(() => { /* computed helpers inside JSX scope */ return null })()}
      {/* Recording indicator */}
      {recording && (
        <div
          className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-red-700/80 border border-red-500/60 rounded-full px-3 py-1 text-white text-xs shadow-lg"
          aria-live="polite"
          aria-label="Recording in progress"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-300 animate-pulse" />
          <span className="tracking-wide font-semibold">REC</span>
        </div>
      )}

      {recordingWarning && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded bg-amber-900/70 border border-amber-600/50 text-amber-100 text-xs">
          {recordingWarning}
        </div>
      )}
      {/* Background: prefer local camera stream; fallback to Huddle iframe */}
      <div className="absolute inset-0 z-0">
        {stream && stream.getVideoTracks().length > 0 ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className={`max-w-full max-h-full object-contain ${mirror ? "transform scale-x-[-1]" : ""}`} />
          </div>
        ) : meetingUrl ? (
          <iframe
            src={meetingUrl}
            className="w-full h-full"
            allow="camera; microphone; clipboard-read; clipboard-write; display-capture; autoplay"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )}
      </div>

      {/* Center overlay to (re)enable camera if needed */}
      {!(stream && stream.getVideoTracks().length > 0) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            className="px-4 py-2 rounded bg-emerald-600 text-white"
            onClick={async () => {
              try {
                const s = await navigator.mediaDevices.getUserMedia({ video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true, audio: false });
                const v = videoRef.current; if (v) { try { (v as any).srcObject = s; await v.play(); } catch {} }
                setStream(s);
                setCamOn(true);
              } catch (e) {
                setMediaError("Camera permission denied");
              }
            }}
          >
            Enable camera
          </button>
        </div>
      )}

      {/* Dim backdrop when any modal is open to match inspiration */}
      {(termsOpen || previewOpen || chatOpen) && (
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
      )}

      {mediaError && (
        <div className="mx-4 mt-2 rounded border border-amber-600/30 bg-amber-900/40 px-3 py-2 text-amber-100 text-xs">
          {mediaError}. Check browser camera permissions for localhost.
        </div>
      )}

      {/* Simple chat panel overlay (right) */}
      <ChatPanel roomId={roomId} token={token} tokenHoldersOnly={tokenHoldersOnly} canChat={isHost || !tokenHoldersOnly} />

      {/* Bottom-center controls (primary) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 bg-gray-900/80 border border-gray-700 rounded-full px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <button
          className={`px-3 py-2 rounded-full text-white ${micOn ? "bg-emerald-600" : "bg-gray-800"}`}
          onClick={async () => {
            if (micOn) {
              try { stream?.getAudioTracks().forEach((t) => { t.stop(); stream.removeTrack(t); }); } catch {}
              setMicOn(false); return;
            }
            try {
              const a = await navigator.mediaDevices.getUserMedia({ audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true, video: false });
              const base = stream || new MediaStream();
              if (!stream) {
                setStream(base);
                if (videoRef.current) { try { (videoRef.current as any).srcObject = base; await (videoRef.current as HTMLVideoElement).play(); } catch {} }
              }
              a.getAudioTracks().forEach((t) => base.addTrack(t));
              setMicOn(true);
            } catch { setMediaError("Microphone permission denied"); }
          }}
          title={micOn ? "Mic on" : "Mic off"}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          className={`px-3 py-2 rounded-full text-white ${camOn ? "bg-emerald-600" : "bg-gray-800"}`}
          onClick={async () => {
            if (camOn) {
              try { stream?.getVideoTracks().forEach((t) => t.stop()); } catch {}
              if (videoRef.current) { try { (videoRef.current as any).srcObject = null; (videoRef.current as HTMLVideoElement).pause(); } catch {} }
              setCamOn(false); return;
            }
            try {
              const s = await navigator.mediaDevices.getUserMedia({ video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true, audio: false });
              try { stream?.getVideoTracks().forEach((t) => t.stop()); } catch {}
              const v = videoRef.current; if (v) { try { (v as any).srcObject = s; await v.play(); } catch {} }
              setStream(s); setCamOn(true);
            } catch { setMediaError("Camera permission denied"); }
          }}
          title={camOn ? "Camera on" : "Camera off"}
        >
          {camOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
        </button>
        <button
          className={`px-3 py-2 rounded-full text-white ${mirror ? "bg-emerald-600" : "bg-gray-800"}`}
          onClick={() => setMirror((m) => !m)}
          title={mirror ? "Unmirror" : "Mirror"}
        >
          {/* simple icon substitute */}
          <span className="text-xs">Mirror</span>
        </button>

        {/* Recording controls */}
        {!recording ? (
          <button
            className={`px-3 py-2 rounded-full text-white ${recordingBusy ? "bg-gray-700 cursor-wait" : "bg-red-600 hover:bg-red-500"}`}
            disabled={recordingBusy}
            onClick={async () => {
              if (!roomId) return;
              setRecordingBusy(true);
              try {
                const res = await fetch("/api/huddle01/recordings/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
                const data = await res.json();
                if (res.ok && data?.success) { setRecording(true); setRecordingWarning(""); }
                else { setRecordingWarning(data?.error || "Failed to start recording"); }
              } catch (e) {
                console.warn("Start recording error", e);
                setRecordingWarning("Failed to start recording");
              } finally {
                setRecordingBusy(false);
              }
            }}
            title="Start recording"
          >
            <span className="text-xs flex items-center gap-1"><CircleDot size={14} /> Start Rec</span>
          </button>
        ) : (
          <button
            className={`px-3 py-2 rounded-full text-white ${recordingBusy ? "bg-gray-700 cursor-wait" : "bg-orange-600 hover:bg-orange-500"}`}
            disabled={recordingBusy}
            onClick={async () => {
              if (!roomId) return;
              setRecordingBusy(true);
              try {
                const res = await fetch("/api/huddle01/recordings/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
                const data = await res.json();
                if (res.ok) { setRecording(false); setRecordingWarning(""); }
                else { setRecordingWarning(data?.error || "Failed to stop recording"); }
              } catch (e) {
                console.warn("Stop recording error", e);
                setRecordingWarning("Failed to stop recording");
              } finally {
                setRecordingBusy(false);
              }
            }}
            title="Stop recording"
          >
            <span className="text-xs flex items-center gap-1"><Square size={14} /> Stop Rec</span>
          </button>
        )}

        {/* End Stream */}
        <button
          className="px-3 py-2 rounded-full text-white bg-gray-700 hover:bg-gray-600"
          onClick={async () => {
            try {
              if (recording && roomId) {
                try { await fetch("/api/huddle01/recordings/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) }); } catch {}
                setRecording(false);
              }
              try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
              if (videoRef.current) {
                try { (videoRef.current as any).srcObject = null; } catch {}
                try { (videoRef.current as HTMLVideoElement).pause(); } catch {}
              }
              setMicOn(false);
              setCamOn(false);
              setStream(null);
            } finally {
              router.push("/studio/history");
            }
          }}
          title="End live stream"
        >
          <span className="text-xs">End</span>
        </button>
      </div>

      {/* Terms modal (must accept) */}
      <Dialog open={termsOpen} onOpenChange={(o) => setTermsOpen(o)}>
        <DialogContent className="sm:max-w-xl rounded-xl shadow-2xl bg-gray-900 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl">Terms and conditions</DialogTitle>
            <DialogDescription className="text-xs opacity-70">Whale.fun Livestream Moderation Policy</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto space-y-4 text-sm text-white/90">
            <div>
              <p className="font-semibold text-white">Purpose</p>
              <p className="text-white/80">To cultivate a social environment on Whale.fun that preserves creativity and freedom of expression and encourages meaningful engagement amongst users, free of illegal, harmful, and negative interactions.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Restriction on Underage Use</p>
              <p className="text-white/80">Livestreaming is restricted to users above the age of 18. Whale.fun takes this user restriction seriously.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Prohibited Content</p>
              <ul className="list-disc pl-6 space-y-1 text-white/80">
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
              <p className="font-semibold text-white">Creator Responsibilities</p>
              <p className="text-white/80">Follow the moderation policy and review moderation guidelines before streaming sensitive topics.</p>
              <p className="text-white/80">Contact legal@Whale.fun.com for appeals.</p>
            </div>
          </div>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => {
                setTermsOpen(false);
                setPreviewOpen(true);
              }}
            >
              I agree
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md rounded-xl bg-gray-900 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Stream preview</DialogTitle>
            <DialogDescription>Choose your video/audio preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs opacity-70">Whale.fun broadcast mode</label>
              <select className="w-full rounded border bg-gray-950 text-white px-3 py-2">
                <option value="studio">Webcam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs opacity-70">Video/audio inputs</label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs opacity-60 mb-1">Camera</label>
                  <select
                    className="w-full rounded border bg-gray-950 text-white px-3 py-2"
                    value={selectedVideoId}
                    onChange={async (e) => {
                      const id = e.target.value; setSelectedVideoId(id);
                      try {
                        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: id } }, audio: false });
                        const v = videoRef.current; if (v) { try { (v as any).srcObject = s; } catch {} }
                        try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
                        setStream(s);
                        setCamOn(true);
                      } catch {}
                    }}
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs opacity-60 mb-1">Microphone</label>
                  <select
                    className="w-full rounded border bg-gray-950 text-white px-3 py-2"
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs opacity-70">Stream title (optional)</label>
              <input className="w-full rounded border bg-gray-950 text-white px-3 py-2" placeholder="Enter a descriptive title..." />
            </div>
          </div>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded bg-emerald-600 text-white"
              onClick={async () => {
                // Ask mic permission explicitly using selected device
                try {
                  const a = await navigator.mediaDevices.getUserMedia({ audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true, video: false });
                  // Attach audio to existing stream if needed
                  try { a.getAudioTracks().forEach((t) => stream?.addTrack(t)); } catch {}
                  setMicOn(true);
                } catch {}
                setPreviewOpen(false); setChatOpen(true);
              }}
            >Next</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat options modal */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-xs rounded-xl bg-gray-900 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Chat options</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Token-gated chat</div>
                <div className="text-xs opacity-70">Only token holders can chat</div>
              </div>
              <Switch checked={tokenHoldersOnly} onCheckedChange={setTokenHoldersOnly} />
            </div>
            <p className="text-xs opacity-70">You can change this anytime during your stream in the settings.</p>
          </div>
          <DialogFooter>
            <button className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setChatOpen(false)}>Go live</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Chat panel component with temporary BroadcastChannel transport.
function ChatPanel({ roomId, token, tokenHoldersOnly, canChat }: { roomId: string; token?: string | null; tokenHoldersOnly?: boolean; canChat?: boolean }) {
  const [messages, setMessages] = useState<Array<{ id: string; from: string; text: string; ts: number }>>([]);
  const [input, setInput] = useState("");
  const chanRef = useRef<BroadcastChannel | null>(null);
  const huddleRef = useRef<any>(null);
  const [clientToken, setClientToken] = useState<string | null>(token || null);

  useEffect(() => {
    if (!roomId) return;
    // Fallback local broadcast
    const chan = new BroadcastChannel(`whale_chat_${roomId}`);
    chan.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type === "chat") setMessages((prev) => [...prev, data.payload]);
    };
    chanRef.current = chan;

    // Try to join Huddle data channel
    (async () => {
      try {
        let tok = clientToken;
        if (!tok) {
          // fetch a guest token from our API
          const res = await fetch("/api/huddle01/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId, role: "guest" }),
          });
          const data = await res.json();
          if (res.ok && data?.token) {
            tok = data.token as string;
            setClientToken(tok);
          } else {
            console.warn("Huddle token fetch failed", data);
            return;
          }
        }
        const mod = await import("@huddle01/web-core");
        const { HuddleClient } = mod as any;
        const projectId = process.env.NEXT_PUBLIC_HUDDLE_PROJECT_ID;
        const client = new HuddleClient({ projectId });
        console.log("[Huddle] joining room", roomId);
        await client.joinRoom({ roomId, token: tok });
        console.log("[Huddle] joined room");
        const attach = (emitter: any) => {
          try {
            emitter.on("peer-data", (evt: any) => {
              const payload = evt?.payload || evt?.data || evt;
              if (payload && payload.whaleType === "chat") {
                setMessages((prev) => [...prev, payload.message]);
              }
            });
            return true;
          } catch { return false; }
        };
        if (!(attach((client as any)) || attach((client as any).events) || attach((client as any).room))) {
          console.warn("[Huddle] unable to attach peer-data listener; staying on BroadcastChannel only");
        }
        huddleRef.current = client;
      } catch (e) {
        console.warn("[Huddle] data channel unavailable, using BroadcastChannel fallback", e);
      }
    })();

    return () => {
      try { chan.close(); } catch {}
      try { huddleRef.current?.leaveRoom?.(); } catch {}
      huddleRef.current = null;
    };
  }, [roomId, token]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const msg = { id: crypto.randomUUID(), from: "You", text, ts: Date.now() };
    setMessages((prev) => [...prev, msg]);
    // BroadcastChannel
    try { chanRef.current?.postMessage({ type: "chat", payload: msg }); } catch {}
    // Huddle data channel
    try {
      const c: any = huddleRef.current;
      const payload = { whaleType: "chat", message: msg };
      const trySend = () => {
        try {
          if (c?.sendData) return c.sendData(payload);
          if (c?.sendDataToRoom) return c.sendDataToRoom(payload);
          if (c?.room?.sendData) return c.room.sendData(payload);
          if (c?.room?.sendDataToRoom) return c.room.sendDataToRoom(payload);
        } catch (e) { console.warn("[Huddle] send failed", e); }
      };
      const ok = trySend();
      if (!ok) setTimeout(() => { trySend(); }, 300);
    } catch {}
    setInput("");
  };

  return (
    <div className="absolute right-3 bottom-3 top-16 w-80 rounded-xl border border-gray-700/60 bg-gray-900/70 backdrop-blur text-white flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700/60 text-sm font-medium flex items-center justify-between">
        <span>Room chat</span>
        {tokenHoldersOnly && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-700/40 border border-emerald-600/40">Holders only</span>
        )}
      </div>
      <div className="flex-1 overflow-auto space-y-2 p-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className="bg-gray-800/70 rounded p-2">
            <div className="text-xs opacity-70 flex justify-between">
              <span>{m.from}</span>
              <span>{new Date(m.ts).toLocaleTimeString()}</span>
            </div>
            <div>{m.text}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs opacity-70">No messages yet. Say hi to your viewers!</div>
        )}
      </div>
      <div className="p-2 border-t border-gray-700/60 flex items-center gap-2">
        <input className="flex-1 rounded bg-gray-800/70 px-2 py-1 text-sm outline-none disabled:opacity-50" placeholder={tokenHoldersOnly && !canChat ? "Chat is token-gated" : "Type a message..."} disabled={tokenHoldersOnly && !canChat} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' ? send() : undefined} />
        <button className="px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-50" disabled={tokenHoldersOnly && !canChat} onClick={send}>Send</button>
      </div>
    </div>
  );
}
