"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface RecordingItem {
  id: string;
  recordingUrl?: string;
  recordingSize: number;
}

export default function HostHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecordingItem[]>([]);
  const [availability, setAvailability] = useState<Record<string, "unknown" | "ok" | "processing" | "error">>({});
  const [checking, setChecking] = useState(false);
  const [reloadNonce, setReloadNonce] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/huddle01/recordings");
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load recordings");
      }
      setItems((data.recordings || []) as RecordingItem[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkAvailability = async (list: RecordingItem[]) => {
    setChecking(true);
    const updates: Record<string, "ok" | "processing" | "error"> = {} as any;
    await Promise.all(
      list.map(async (rec) => {
        const url = resolveRecordingUrl(rec);
        if (!url) {
          updates[rec.id] = "processing";
          return;
        }
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (head.ok) updates[rec.id] = "ok";
          else if (head.status === 403 || head.status === 404) updates[rec.id] = "processing";
          else updates[rec.id] = "error";
        } catch {
          updates[rec.id] = "processing";
        }
      })
    );
    setAvailability((prev) => ({ ...prev, ...updates }));
    setChecking(false);
  };

  // Re-check availability shortly after load; recordings may need time to process
  useEffect(() => {
    if (items.length === 0) return;
    checkAvailability(items);
    const t = setTimeout(() => checkAvailability(items), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(",")]);

  const buildPlayableSrc = (id: string, url: string) => {
    const nonce = reloadNonce[id];
    // Add small start offset to help metadata; add cache-buster if retried
    const sep = url.includes("?") ? "&" : "?";
    const withNonce = nonce ? `${url}${sep}v=${nonce}` : url;
    return `${withNonce}#t=0.1`;
  };

  const resolveRecordingUrl = (rec: any): string | null => {
    const candidates = [
      rec?.recordingUrl,
      rec?.url,
      rec?.playbackUrl,
      rec?.downloadUrl,
      rec?.recordingS3Url,
    ].filter(Boolean) as string[];
    return candidates.length > 0 ? candidates[0] : null;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Host Recording History</h1>
          <Link href="/studio" className="px-3 py-1 rounded bg-gray-900 text-white border border-gray-700">Go to Studio</Link>
        </div>

        {loading && <div className="opacity-70">Loading recordings…</div>}
        {error && (
          <div className="mb-4 rounded border border-amber-600/30 bg-amber-900/40 px-3 py-2 text-amber-100 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="opacity-70">No recordings found yet. Start a recording from your live room.</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((rec) => {
            const url = resolveRecordingUrl(rec);
            const avail = availability[rec.id] || "unknown";
            const processing = avail === "processing" || avail === "unknown";
            const playableSrc = url ? buildPlayableSrc(rec.id, url) : null;
            return (
              <div key={rec.id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                <div className="text-sm mb-2 flex items-center justify-between">
                  <div className="opacity-80 truncate">{rec.id}</div>
                  <div className="flex items-center gap-2">
                    {processing && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-800/50 border border-yellow-600/40">Processing</span>
                    )}
                    {avail === "error" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-800/50 border border-red-600/40">Unavailable</span>
                    )}
                    <div className="text-xs opacity-60">{(rec.recordingSize / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                </div>
                <div className="aspect-video bg-black/60 rounded overflow-hidden">
                  {processing || !url ? (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-70">
                      {url ? "Recording is processing. Please refresh in a moment." : "Recording URL not available yet."}
                    </div>
                  ) : (
                    <video
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                      crossOrigin="anonymous"
                      onError={() => setAvailability((prev) => ({ ...prev, [rec.id]: "error" }))}
                      playsInline
                      controlsList="nodownload"
                      key={playableSrc || undefined}
                    >
                      {playableSrc && <source src={playableSrc} type="video/mp4" />}
                    </video>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-emerald-700/60 text-xs">Open</a>
                  )}
                  <button
                    className="px-2 py-1 rounded bg-gray-800 text-xs border border-gray-700"
                    onClick={async () => {
                      try {
                        const u = url || "";
                        if (u) await navigator.clipboard.writeText(u);
                      } catch {}
                    }}
                  >Copy URL</button>
                  <button
                    className="px-2 py-1 rounded bg-gray-800 text-xs border border-gray-700 disabled:opacity-50"
                    disabled={checking}
                    onClick={() => checkAvailability([rec])}
                  >Re-check</button>
                  <button
                    className="px-2 py-1 rounded bg-gray-800 text-xs border border-gray-700"
                    onClick={() => setReloadNonce((prev) => ({ ...prev, [rec.id]: Date.now() }))}
                  >Retry</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}