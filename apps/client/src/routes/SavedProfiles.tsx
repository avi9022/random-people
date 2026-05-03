import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProfileList } from "@/components/ProfileList";
import { useSavedProfiles } from "@/hooks/useSavedProfiles";

export default function SavedProfiles() {
  const { data, isLoading, isError, error } = useSavedProfiles();

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">← Back</Link>
      </Button>

      <h1 className="text-3xl font-bold">Saved Profiles</h1>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-destructive text-sm">
          Error: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {data && (
        <ProfileList
          profiles={data}
          source="saved"
          emptyMessage="No saved profiles yet. Go to Fetch and save one from the detail screen."
        />
      )}
    </div>
  );
}
