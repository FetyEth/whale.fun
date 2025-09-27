import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Circle, Square, FlipHorizontal2 } from "lucide-react";

type Props = {
  camEnabled: boolean;
  micEnabled: boolean;
  onToggleCam: () => void;
  onToggleMic: () => void;
  onEndStream: () => void;
  recEnabled?: boolean;
  onToggleRec?: () => void;
  mirrorEnabled?: boolean;
  onToggleMirror?: () => void;
  roomId?: string;
  token?: string;
};

export default function StreamPlayer({
  camEnabled,
  micEnabled,
  onToggleCam,
  onToggleMic,
  onEndStream,
  recEnabled,
  onToggleRec,
  mirrorEnabled,
  onToggleMirror,
  roomId,
  token,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const playTickRef = useRef<number | null>(null);
  const huddleRef = useRef<any>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Join Huddle room and try to publish local tracks when identifiers provided
  useEffect(() => {
    let disposed = false;
    (async () => {
      if (!roomId || !token) return;
      try {
        const mod = await import("@huddle01/web-core");
        const { HuddleClient } = mod as any;
        const projectId = (process as any).env?.NEXT_PUBLIC_HUDDLE_PROJECT_ID || undefined;
        const client = new HuddleClient({ projectId });
        await client.joinRoom({ roomId, token });
        if (disposed) return;
        huddleRef.current = client;
        // Publish available local tracks, if SDK exposes APIs
        const publishTracks = async () => {
          const s = streamRef.current;
          if (!s) return;
          for (const t of s.getTracks()) {
            try {
              if (client?.produceTrack) await client.produceTrack(t, t.kind);
              else if (client?.addTrack) await client.addTrack(t);
              else if (client?.publishTrack) await client.publishTrack(t);
            } catch {}
          }
        };
        await publishTracks();
      } catch (e) {
        // If SDK not available, continue with local preview only
      }
    })();
    return () => {
      disposed = true;
      try { huddleRef.current?.leaveRoom?.(); } catch {}
      huddleRef.current = null;
    };
  // we deliberately ignore deps to avoid re-joining on every minor change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const attachTrackListeners = (stream: MediaStream) => {
    stream.getTracks().forEach((t) => {
      t.onended = () => {
        // Attempt restart on track end
        void startStream();
      };
      const anyTrack = t as any;
      if (typeof anyTrack.oninactive !== "undefined") anyTrack.oninactive = () => { void startStream(); };
    });
  };

  const startStream = useCallback(async () => {
    try {
      stopStream();
      if (!camEnabled && !micEnabled) return;
      // Prefer decent FPS/size, but allow browser to adapt
      const constraints: MediaStreamConstraints = {
        video: camEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' } : false,
        audio: micEnabled ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      attachTrackListeners(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream as any;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      // Silently ignore; user may have denied permissions
    }
  }, [camEnabled, micEnabled]);

  // Initialize or update media stream
  useEffect(() => {
    // If we already have a stream, toggle track enabled states; else start fresh
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => (t.enabled = camEnabled));
      streamRef.current.getAudioTracks().forEach(t => (t.enabled = micEnabled));
      if (camEnabled || micEnabled) {
        // ensure playing
        videoRef.current?.play().catch(() => {});
      } else {
        stopStream();
      }
    } else {
      void startStream();
    }
  }, [camEnabled, micEnabled, startStream]);

  // Try to keep playback running smoothly
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      v.play().catch(() => {});
    };
    const onVisibility = () => {
      if (!document.hidden) v.play().catch(() => {});
    };
    const tick = () => {
      if (v.paused || v.readyState < 2) {
        v.play().catch(() => {});
      }
      playTickRef.current = requestAnimationFrame(tick);
    };
    v.addEventListener("loadedmetadata", onLoaded);
    document.addEventListener("visibilitychange", onVisibility);
    playTickRef.current = requestAnimationFrame(tick);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      document.removeEventListener("visibilitychange", onVisibility);
      if (playTickRef.current) cancelAnimationFrame(playTickRef.current);
    };
  }, []);

  // Restart stream if devices change (e.g., camera unplugged)
  useEffect(() => {
    const handler = () => void startStream();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
    };
  }, []);

  // End stream helper: stop tracks then call parent end
  const handleEnd = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // Leave Huddle room if joined
    try { huddleRef.current?.leaveRoom?.(); } catch {}
    huddleRef.current = null;
    // Clear video element
    try {
      if (videoRef.current) {
        const v = videoRef.current as HTMLVideoElement & { srcObject?: any };
        v.pause();
        (v as any).srcObject = null;
      }
    } catch {}
    // Stop playback tick
    if (playTickRef.current) cancelAnimationFrame(playTickRef.current);
    onEndStream();
  };

  // Start/stop recording: prefer Huddle server endpoints when roomId exists; fallback to MediaRecorder
  useEffect(() => {
    (async () => {
      try {
        if (roomId) {
          if (recEnabled && !isRecording) {
            const res = await fetch("/api/huddle01/recordings/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
            if (res.ok) setIsRecording(true);
          } else if (!recEnabled && isRecording) {
            const res = await fetch("/api/huddle01/recordings/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
            if (res.ok) setIsRecording(false);
          }
          return; // if room-backed, don't run local fallback
        }
        // Local fallback
        const canRecord = !!streamRef.current && typeof MediaRecorder !== "undefined";
        if (recEnabled && canRecord && !isRecording) {
          try {
            const recorder = new MediaRecorder(streamRef.current as MediaStream, { mimeType: "video/webm" });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
              setIsRecording(false);
              const blob = new Blob(chunksRef.current, { type: "video/webm" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `recording-${Date.now()}.webm`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            };
            recorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
          } catch {}
        } else if (!recEnabled && isRecording && recorderRef.current) {
          recorderRef.current.stop();
        }
      } catch {}
    })();
  }, [recEnabled, isRecording, roomId]);
  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-[#0D1117]">
          {/* Top bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[12px] bg-rose-100 text-rose-700 px-2 py-1 rounded">
                ● Live
              </span>
              {isRecording && (
                <span className="inline-flex items-center gap-1 text-[12px] bg-red-600 text-white px-2 py-1 rounded z-50">
                  ● REC
                </span>
              )}
            </div>
            <Button onClick={handleEnd} className="h-8 px-3 rounded-lg bg-black text-white">End Stream</Button>
          </div>
          {/* Canvas area */}
          <div className="absolute inset-0 p-4">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full rounded-xl bg-[#0B1220] border border-[#0000001A] object-cover ${mirrorEnabled ? "scale-x-[-1]" : ""}`}
            />
            {/* Corner Guides */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute left-0 top-0 h-6 w-6 border-t-4 border-l-4 border-black/70 rounded-tl-lg" />
              <div className="absolute right-0 top-0 h-6 w-6 border-t-4 border-r-4 border-black/70 rounded-tr-lg" />
              <div className="absolute left-0 bottom-0 h-6 w-6 border-b-4 border-l-4 border-black/70 rounded-bl-lg" />
              <div className="absolute right-0 bottom-0 h-6 w-6 border-b-4 border-r-4 border-black/70 rounded-br-lg" />
            </div>
          </div>
          {/* Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center">
            <div className="flex gap-2 rounded-full bg-[#0B0B0B]/80 px-2 py-1.5 backdrop-blur border border-[#0000001A] shadow">
              <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-xl ${micEnabled ? "bg-emerald-600 text-white" : ""}`} onClick={onToggleMic} aria-label="Toggle Mic">
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-xl ${camEnabled ? "bg-emerald-600 text-white" : ""}`} onClick={onToggleCam} aria-label="Toggle Camera">
                {camEnabled ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-xl ${mirrorEnabled ? "bg-white text-gray-900" : ""}`} onClick={onToggleMirror} aria-label="Toggle Mirror">
                <FlipHorizontal2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-xl ${recEnabled ? "bg-red-600 text-white" : ""}`} onClick={onToggleRec} aria-label="Toggle Recording">
                {recEnabled ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </Button>
              <Button onClick={handleEnd} className="h-9 px-4 rounded-xl bg-red-600 text-white">End</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
