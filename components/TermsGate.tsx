"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function TermsGate({ onAccepted }: { onAccepted?: () => void }) {
  const storageKey = "livestream_terms_accepted";
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "true") {
        setAccepted(true);
        setChecked(true);
      }
    } catch {}
  }, []);

  const accept = () => {
    if (!checked) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setAccepted(true);
    onAccepted?.();
  };

  if (accepted) return null;

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Terms and Conditions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <p className="text-sm text-gray-600">
          Please review and accept the Terms to access Boss Battle, Live Chat and the Trade panel.
        </p>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} />
          <span>
            I agree to Whale.fun&apos;s Terms of Service and consent to the use of my camera, microphone and recordings as configured.
          </span>
        </label>
        <Button onClick={accept} disabled={!checked} className="w-full h-11 rounded-xl font-semibold">
          Accept and Continue
        </Button>
      </CardContent>
    </Card>
  );
}
