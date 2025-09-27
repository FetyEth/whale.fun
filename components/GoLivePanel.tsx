"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function GoLivePanel() {
  const router = useRouter();
  const [title, setTitle] = useState("default room");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [recordOn, setRecordOn] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [creating, setCreating] = useState(false);

  const startStreaming = useCallback(async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/huddle01/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const roomData = await res.json();
      if (!res.ok || roomData?.error || !roomData?.roomId) {
        throw new Error(roomData?.error || "Failed to create room");
      }
      const newRoomId = roomData.roomId as string;
      const tres = await fetch("/api/huddle01/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: newRoomId, userId: userId || undefined }),
      });
      const tdata = await tres.json();
      if (!tres.ok || tdata?.error || !tdata?.token) {
        throw new Error(tdata?.error || "Failed to generate token");
      }
      const tok = tdata.token as string;
      const qp = new URLSearchParams({ token: tok, cam: String(camOn), mic: String(micOn), rec: String(recordOn), mirror: String(mirror) });
      router.push(`/studio/room/${encodeURIComponent(newRoomId)}?${qp.toString()}`);
    } catch (e: any) {
      alert(e?.message || "Failed to start streaming");
    } finally {
      setCreating(false);
    }
  }, [title, description, userId, camOn, micOn, recordOn, mirror, router]);

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Go Live Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Input placeholder="Room title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Input placeholder="Host name" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
            <span className="text-sm">Camera</span>
            <Switch checked={camOn} onCheckedChange={setCamOn as any} />
          </label>
          <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
            <span className="text-sm">Microphone</span>
            <Switch checked={micOn} onCheckedChange={setMicOn as any} />
          </label>
          <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
            <span className="text-sm">Recording</span>
            <Switch checked={recordOn} onCheckedChange={setRecordOn as any} />
          </label>
          <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: '#0000001A' }}>
            <span className="text-sm">Mirror View</span>
            <Switch checked={mirror} onCheckedChange={setMirror as any} />
          </label>
        </div>
        <div className="pt-2">
          <Button onClick={startStreaming} disabled={creating} className="w-full h-11 rounded-xl font-semibold">
            {creating ? "Starting..." : "Start Streaming"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
