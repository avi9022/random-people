import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { chatRequestSchema, type ChatMessage } from "@finq/shared";
import { profilesRepo } from "../db.js";

export const chatRouter = Router();

const SYSTEM_PROMPT = `You are a friendly assistant helping the user explore their saved profiles in a small full-stack app. Saved profiles are random users (from randomuser.me) that the user chose to save to a personal SQLite database.

When the user asks anything that requires knowing about saved profiles, use the available tools to look up data. Never invent or fabricate profile information.

Keep responses concise — usually 1–3 sentences unless the user explicitly asks for detail. If the database is empty, say so plainly. If a question can't be answered from the saved profiles, say so plainly.`;

const listSavedProfiles = betaZodTool({
  name: "list_saved_profiles",
  description:
    "List every profile saved in the user's database. Returns an array with each profile's full data (name, gender, country, email, phone, age, address). Use this for questions about counts, filters, summaries, or finding people by attribute.",
  inputSchema: z.object({}),
  run: () => {
    const profiles = profilesRepo.list();
    return JSON.stringify(profiles);
  },
});

const getProfileByUuid = betaZodTool({
  name: "get_profile_by_uuid",
  description:
    "Get a single saved profile by its uuid. Use this only when you already know the uuid (e.g. from list_saved_profiles).",
  inputSchema: z.object({
    uuid: z.string().describe("The unique identifier of the profile."),
  }),
  run: ({ uuid }) => {
    const profile = profilesRepo.get(uuid);
    return profile
      ? JSON.stringify(profile)
      : JSON.stringify({ error: "Profile not found" });
  },
});

chatRouter.post("/", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid chat request", issues: parsed.error.issues });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. Add it to apps/server/.env.",
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: object) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const client = new Anthropic({ apiKey });

  try {
    const runner = client.beta.messages.toolRunner({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [listSavedProfiles, getProfileByUuid],
      messages: parsed.data.messages.map(
        (m: ChatMessage): Anthropic.Beta.BetaMessageParam => ({
          role: m.role,
          content: m.content,
        })
      ),
      stream: true,
    });

    for await (const messageStream of runner) {
      for await (const event of messageStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          send({ type: "delta", text: event.delta.text });
        }
      }
    }

    send({ type: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chat] error:", message);
    send({ type: "error", message });
  } finally {
    res.end();
  }
});
