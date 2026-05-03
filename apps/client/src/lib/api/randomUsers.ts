import axios from "axios";
import type { Profile } from "@finq/shared";

interface RandomUserApiResponse {
  results: Array<{
    gender: string;
    name: { title: string; first: string; last: string };
    email: string;
    phone: string;
    login: { uuid: string };
    picture: { large: string; thumbnail: string };
    location: {
      street: { number: number; name: string };
      city: string;
      state: string;
      country: string;
    };
    dob: { date: string; age: number };
  }>;
}

const randomUserClient = axios.create({
  baseURL: "https://randomuser.me/api",
  timeout: 10_000,
});

export async function fetchRandomUsers(count = 10): Promise<Profile[]> {
  const { data } = await randomUserClient.get<RandomUserApiResponse>("/", {
    params: { results: count, noinfo: true },
  });

  return data.results.map(
    (u): Profile => ({
      uuid: u.login.uuid,
      gender: u.gender,
      name: u.name,
      email: u.email,
      phone: u.phone,
      picture: { large: u.picture.large, thumbnail: u.picture.thumbnail },
      location: u.location,
      dob: u.dob,
    })
  );
}
