import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Profile, ProfileName } from "@finq/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { randomUsersQueryKey } from "@/hooks/useRandomUsers";
import { savedProfilesQueryKey } from "@/hooks/useSavedProfiles";
import {
  deleteProfile,
  getProfile,
  saveProfile,
  updateProfile,
} from "@/lib/api/profiles";

function birthYear(dobDate: string): string {
  const y = new Date(dobDate).getFullYear();
  return Number.isFinite(y) ? String(y) : "—";
}

const savedProfileQueryKey = (uuid: string) =>
  ["saved-profile", uuid] as const;

export default function Profile() {
  const { uuid = "" } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Subscribe to the random-users cache (no fetch — populated by /random).
  // Subscribing instead of plain getQueryData lets the Profile page re-render
  // when we mutate the cache via setQueryData (the unsaved-profile Update flow).
  const { data: randomList } = useQuery<Profile[]>({
    queryKey: randomUsersQueryKey,
    enabled: false,
  });
  const randomCached = randomList?.find((p) => p.uuid === uuid);

  // Skip the singleton fetch when this uuid is in the random-users cache —
  // the user just clicked a row on /random, so we already have the display
  // data and the profile is almost certainly not in our DB. The rare case
  // (a random uuid that's also saved) degrades via the Save 409 path.
  const savedQuery = useQuery({
    queryKey: savedProfileQueryKey(uuid),
    queryFn: () => getProfile(uuid),
    enabled: uuid !== "" && randomCached === undefined,
    initialData: () =>
      queryClient
        .getQueryData<Profile[]>(savedProfilesQueryKey)
        ?.find((p) => p.uuid === uuid) ?? undefined,
  });

  const isSaved =
    randomCached !== undefined ? false : savedQuery.data != null;
  const profile: Profile | undefined = randomCached ?? savedQuery.data ?? undefined;

  const [name, setName] = useState<ProfileName | null>(null);
  const editedName = name ?? profile?.name ?? null;

  const setField = (field: keyof ProfileName, value: string) => {
    if (!profile) return;
    setName({ ...(name ?? profile.name), [field]: value });
  };

  const isNameDirty =
    editedName != null &&
    profile != null &&
    (editedName.title !== profile.name.title ||
      editedName.first !== profile.name.first ||
      editedName.last !== profile.name.last);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const saveMutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (created) => {
      queryClient.setQueryData(savedProfileQueryKey(created.uuid), created);
      queryClient.invalidateQueries({ queryKey: savedProfilesQueryKey });
      navigate("/saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProfile(uuid),
    onSuccess: () => {
      queryClient.setQueryData(savedProfileQueryKey(uuid), null);
      queryClient.invalidateQueries({ queryKey: savedProfilesQueryKey });
      navigate("/saved");
    },
  });

  const updateSavedMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(savedProfileQueryKey(updated.uuid), updated);
      queryClient.setQueryData<Profile[] | undefined>(
        savedProfilesQueryKey,
        (list) => list?.map((p) => (p.uuid === updated.uuid ? updated : p))
      );
      setName(null);
    },
  });

  const handleUpdate = () => {
    if (!profile || !editedName || !isNameDirty) return;
    const next: Profile = { ...profile, name: editedName };

    if (isSaved) {
      updateSavedMutation.mutate(next);
      return;
    }
    queryClient.setQueryData<Profile[] | undefined>(
      randomUsersQueryKey,
      (list) => list?.map((p) => (p.uuid === next.uuid ? next : p))
    );
    setName(null);
  };

  if (savedQuery.isLoading && !profile) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack}>
          ← Back
        </Button>
        <p className="text-destructive text-sm">
          Profile not found. It may have expired from the cache — go back and try again.
        </p>
      </div>
    );
  }

  const errorMessage =
    saveMutation.error instanceof Error
      ? saveMutation.error.message
      : deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : updateSavedMutation.error instanceof Error
          ? updateSavedMutation.error.message
          : null;

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={goBack}>
        ← Back
      </Button>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <img
          src={profile.picture.large}
          alt=""
          className="h-40 w-40 rounded-lg object-cover shrink-0"
        />

        <div className="grid flex-1 gap-4 text-sm">
          <Field label="Gender" value={profile.gender} />

          <div>
            <div className="text-muted-foreground text-xs mb-1">Name</div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                aria-label="Title"
                value={editedName?.title ?? ""}
                onChange={(e) => setField("title", e.target.value)}
              />
              <Input
                aria-label="First name"
                value={editedName?.first ?? ""}
                onChange={(e) => setField("first", e.target.value)}
              />
              <Input
                aria-label="Last name"
                value={editedName?.last ?? ""}
                onChange={(e) => setField("last", e.target.value)}
              />
            </div>
          </div>

          <Field
            label="Age / Year of birth"
            value={`${profile.dob.age} (${birthYear(profile.dob.date)})`}
          />

          <div>
            <div className="text-muted-foreground text-xs mb-1">Address</div>
            <div className="space-y-0.5">
              <div>
                {profile.location.street.number} {profile.location.street.name}
              </div>
              <div>{profile.location.city}</div>
              <div>{profile.location.state}</div>
            </div>
          </div>

          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {!isSaved && (
          <Button
            onClick={() => saveMutation.mutate(profile)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        )}
        {isSaved && (
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={handleUpdate}
          disabled={!isNameDirty || updateSavedMutation.isPending}
        >
          {updateSavedMutation.isPending ? "Updating…" : "Update"}
        </Button>
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
      </div>

      {errorMessage && (
        <p className="text-destructive text-sm">Error: {errorMessage}</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div>{value}</div>
    </div>
  );
}
