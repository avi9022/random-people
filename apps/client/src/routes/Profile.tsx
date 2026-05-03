import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { uuid } = useParams<{ uuid: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source");

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to={source === "saved" ? "/saved" : "/random"}>← Back</Link>
      </Button>
      <h1 className="text-3xl font-bold">Screen 3 — Profile</h1>
      <p className="text-muted-foreground text-sm">
        uuid: <code>{uuid}</code> · source: <code>{source ?? "unknown"}</code>
      </p>
      <p className="text-muted-foreground">Coming next phase.</p>
    </div>
  );
}
