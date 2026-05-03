import { Link } from "react-router-dom";
import { fullName, type Profile } from "@finq/shared";
import { Button } from "@/components/ui/button";

export function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex gap-4 items-start">
      <img
        src={profile.picture.thumbnail}
        alt=""
        className="h-14 w-14 rounded-full shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1 text-sm">
        <div className="font-semibold">{fullName(profile)}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
          <div>
            <span className="font-medium text-foreground capitalize">
              {profile.gender}
            </span>{" "}
            · age {profile.dob.age}
          </div>
          <div>{profile.location.country}</div>
          <div className="truncate">{profile.email}</div>
          <div>{profile.phone}</div>
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to={`/profile/${profile.uuid}`}>View</Link>
      </Button>
    </div>
  );
}
