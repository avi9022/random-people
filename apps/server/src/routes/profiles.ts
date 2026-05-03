import { Router } from "express";
import { profileSchema } from "@finq/shared";
import { profilesRepo } from "../db.js";

export const profilesRouter = Router();

profilesRouter.get("/", (_req, res) => {
  res.json(profilesRepo.list());
});

profilesRouter.get("/:uuid", (req, res) => {
  const profile = profilesRepo.get(req.params.uuid);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

profilesRouter.post("/", (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile", issues: parsed.error.issues });
    return;
  }

  try {
    res.status(201).json(profilesRepo.insert(parsed.data));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      res.status(409).json({ error: "Profile with this uuid already exists" });
      return;
    }
    throw err;
  }
});

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string" &&
    err.code.startsWith("SQLITE_CONSTRAINT")
  );
}

profilesRouter.put("/:uuid", (req, res) => {
  const { uuid } = req.params;
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile", issues: parsed.error.issues });
    return;
  }
  const profile = parsed.data;

  if (profile.uuid !== uuid) {
    res.status(400).json({ error: "uuid in body does not match URL" });
    return;
  }

  if (!profilesRepo.get(uuid)) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(profilesRepo.update(profile));
});

profilesRouter.delete("/:uuid", (req, res) => {
  const deleted = profilesRepo.delete(req.params.uuid);
  if (!deleted) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.status(204).end();
});
