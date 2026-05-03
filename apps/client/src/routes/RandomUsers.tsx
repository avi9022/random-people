import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function RandomUsers() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">← Back</Link>
      </Button>
      <h1 className="text-3xl font-bold">Screen 1 — Random Users</h1>
      <p className="text-muted-foreground">Coming next phase.</p>
    </div>
  );
}
