import { useQuery } from "@tanstack/react-query";
import { listProfiles } from "@/lib/api/profiles";

export const savedProfilesQueryKey = ["saved-profiles"] as const;

export function useSavedProfiles() {
  return useQuery({
    queryKey: savedProfilesQueryKey,
    queryFn: listProfiles,
  });
}
