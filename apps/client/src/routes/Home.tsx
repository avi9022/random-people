import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8 text-center">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Random People</h1>
          <p className="text-muted-foreground">
            Browse random users or review profiles you've saved.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/random">Fetch</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/saved">History</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
