import { useQuery } from "@tanstack/react-query";
import { fetchRandomUsers } from "@/lib/api/randomUsers";

export const randomUsersQueryKey = ["random-users"] as const;

export function useRandomUsers() {
  return useQuery({
    queryKey: randomUsersQueryKey,
    queryFn: () => fetchRandomUsers(10),
    staleTime: Infinity,
  });
}
