import axios from "axios";
import type { Profile } from "@finq/shared";

const client = axios.create({
  baseURL: "/api/profiles",
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export async function listProfiles(): Promise<Profile[]> {
  const { data } = await client.get<Profile[]>("/");
  return data;
}

export async function getProfile(uuid: string): Promise<Profile> {
  const { data } = await client.get<Profile>(`/${uuid}`);
  return data;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const { data } = await client.post<Profile>("/", profile);
  return data;
}

export async function updateProfile(profile: Profile): Promise<Profile> {
  const { data } = await client.put<Profile>(`/${profile.uuid}`, profile);
  return data;
}

export async function deleteProfile(uuid: string): Promise<void> {
  await client.delete(`/${uuid}`);
}
