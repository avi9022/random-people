import { z } from "zod";

export const profileNameSchema = z.object({
  title: z.string(),
  first: z.string(),
  last: z.string(),
});

export const profileSchema = z.object({
  uuid: z.string(),
  gender: z.string(),
  name: profileNameSchema,
  email: z.string(),
  phone: z.string(),
  picture: z.object({
    large: z.string(),
    thumbnail: z.string(),
  }),
  location: z.object({
    street: z.object({
      number: z.number(),
      name: z.string(),
    }),
    city: z.string(),
    state: z.string(),
    country: z.string(),
  }),
  dob: z.object({
    date: z.string(),
    age: z.number(),
  }),
});

export type ProfileName = z.infer<typeof profileNameSchema>;
export type Profile = z.infer<typeof profileSchema>;

export function fullName(p: Pick<Profile, "name">): string {
  return `${p.name.title} ${p.name.first} ${p.name.last}`;
}
