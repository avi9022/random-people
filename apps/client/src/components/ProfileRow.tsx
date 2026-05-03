import { Link } from "react-router-dom";
import { fullName, type Profile } from "@finq/shared";

interface Props {
  profile: Profile;
  source: "random" | "saved";
}

export function ProfileRow({ profile, source }: Props) {
  return (
    <Link
      to={`/profile/${profile.uuid}?source=${source}`}
      className="flex items-center gap-4 rounded-md border p-3 hover:bg-accent transition-colors"
    >
      <img
        src={profile.picture.thumbnail}
        alt=""
        className="h-12 w-12 rounded-full shrink-0"
      />
      <div className="grid flex-1 gap-1 text-sm sm:grid-cols-2">
        <div className="font-medium">{fullName(profile)}</div>
        <div className="text-muted-foreground capitalize">
          {profile.gender}
        </div>
        <div className="text-muted-foreground">{profile.location.country}</div>
        <div className="text-muted-foreground truncate">{profile.email}</div>
        <div className="text-muted-foreground">{profile.phone}</div>
      </div>
    </Link>
  );
}
