import { useMemo, useState } from "react";
import type { Profile } from "@finq/shared";
import { Input } from "@/components/ui/input";
import { ProfileRow } from "@/components/ProfileRow";

interface Props {
  profiles: Profile[];
  emptyMessage?: string;
}

export function ProfileList({ profiles, emptyMessage }: Props) {
  const [nameFilter, setNameFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const filtered = useMemo(() => {
    const n = nameFilter.trim().toLowerCase();
    const c = countryFilter.trim().toLowerCase();
    if (!n && !c) return profiles;
    return profiles.filter((p) => {
      const fullNameLower =
        `${p.name.title} ${p.name.first} ${p.name.last}`.toLowerCase();
      const matchesName = !n || fullNameLower.includes(n);
      const matchesCountry =
        !c || p.location.country.toLowerCase().includes(c);
      return matchesName && matchesCountry;
    });
  }, [profiles, nameFilter, countryFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Filter by name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <Input
          placeholder="Filter by country…"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {profiles.length === 0
            ? (emptyMessage ?? "No profiles.")
            : "No profiles match the current filters."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.uuid}>
              <ProfileRow profile={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
