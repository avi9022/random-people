import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SHARED_PLACEHOLDER } from "@finq/shared";

export default function App() {
  const [healthText, setHealthText] = useState<string>("loading…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setHealthText(JSON.stringify(data)))
      .catch((err) => setHealthText(`error: ${String(err)}`));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-xl w-full space-y-6 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Finq Task — Phase 0</h1>
        <p className="text-muted-foreground">
          Scaffold sanity check. Three signals below should all look healthy.
        </p>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm">
            <span className="font-semibold">/api/health:</span>{" "}
            <code className="text-xs">{healthText}</code>
          </div>
          <div className="text-sm">
            <span className="font-semibold">@finq/shared:</span>{" "}
            <code className="text-xs">{SHARED_PLACEHOLDER}</code>
          </div>
        </div>

        <Button>shadcn button</Button>
      </div>
    </div>
  );
}
