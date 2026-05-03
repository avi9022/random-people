import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRandomUsers } from "@/hooks/useRandomUsers";
import { fullName } from "@finq/shared";

export default function RandomUsers() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useRandomUsers();

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">← Back</Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Screen 1 — Random Users</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refetching…" : "Refetch"}
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">
          Error: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {data && (
        <ul className="space-y-2">
          {data.map((p) => (
            <li
              key={p.uuid}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <img
                src={p.picture.thumbnail}
                alt=""
                className="h-12 w-12 rounded-full"
              />
              <div className="text-sm">
                <div className="font-medium">{fullName(p)}</div>
                <div className="text-muted-foreground">
                  {p.location.country} · {p.email}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
