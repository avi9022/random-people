import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { randomUsersQueryKey } from "@/hooks/useRandomUsers";

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleFetch = () => {
    // The PDF says Fetch should "get the data from random user API" — invalidate
    // so /random refetches a fresh batch on mount (overrides staleTime: Infinity).
    queryClient.invalidateQueries({ queryKey: randomUsersQueryKey });
    navigate("/random");
  };

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
          <Button size="lg" onClick={handleFetch}>
            Fetch
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/saved">History</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
