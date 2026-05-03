import { Link } from "react-router-dom";
import { fullName, type Profile } from "@finq/shared";

export function ProfileGrid({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {profiles.map((p) => (
          <Link
            key={p.uuid}
            to={`/profile/${p.uuid}`}
            className="flex flex-col items-center gap-2 rounded-md p-2 hover:bg-accent transition-colors"
          >
            <img
              src={p.picture.thumbnail}
              alt=""
              className="h-14 w-14 rounded-full"
            />
            <div className="text-xs font-medium text-center line-clamp-1">
              {fullName(p)}
            </div>
            <div className="text-[10px] text-muted-foreground line-clamp-1">
              {p.location.country}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
