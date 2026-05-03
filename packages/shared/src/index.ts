export const SHARED_PLACEHOLDER = "shared-ok";

export interface Profile {
  uuid: string;
  gender: string;
  name: {
    title: string;
    first: string;
    last: string;
  };
  email: string;
  phone: string;
  picture: {
    large: string;
    thumbnail: string;
  };
  location: {
    street: { number: number; name: string };
    city: string;
    state: string;
    country: string;
  };
  dob: {
    date: string;
    age: number;
  };
}

export function fullName(p: Pick<Profile, "name">): string {
  return `${p.name.title} ${p.name.first} ${p.name.last}`;
}
