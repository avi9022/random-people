import { randomUUID } from "node:crypto";
import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  chatRequestSchema,
  type ChatMessage,
  type Profile,
} from "@finq/shared";
import { profilesRepo } from "../db.js";

export const chatRouter = Router();

// Memoized lazily so the env var has time to load via dotenv before first use.
let _client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a friendly assistant helping the user explore their saved profiles in a small full-stack app. Saved profiles are random users (from randomuser.me) that the user chose to save to a personal SQLite database.

You have data tools to look up profiles, and rendering tools to show rich UI:

- list_saved_profiles(): list every saved profile.
- get_profile_by_uuid({uuid}): fetch one profile by uuid.
- render_profile_card({uuid}): show ONE profile as a visual card. Use when discussing or focusing on a single person.
- render_profile_grid({uuids}): show MULTIPLE profiles as a visual grid. Use for list/show questions ("who do I have", "list X profiles").
- render_stats_breakdown({field}): show a bar chart breakdown by a field. Use for "how many", "distribution", "by country/gender/age" questions.

Rules:
- Always use tools to look up data — never invent profile information.
- When a question can be answered visually, prefer rendering over a text dump. After rendering, give one short sentence of context (e.g. "You have 5 profiles, mostly from the US.").
- For purely conversational questions, just answer in text.
- Keep responses concise — usually 1–2 sentences.
- If the database is empty, say so plainly without trying to render anything.`;

interface UiEvent {
  type: "ui";
  id: string;
  component: "ProfileCard" | "ProfileGrid" | "StatsBreakdown";
  props: Record<string, unknown>;
}

type SseEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | UiEvent;

function makeTools(emit: (e: SseEvent) => void) {
  const listSavedProfiles = betaZodTool({
    name: "list_saved_profiles",
    description:
      "List every profile saved in the user's database. Returns full data (name, gender, country, email, phone, age, address) for each.",
    inputSchema: z.object({}),
    run: () => JSON.stringify(profilesRepo.list()),
  });

  const getProfileByUuid = betaZodTool({
    name: "get_profile_by_uuid",
    description:
      "Get a single saved profile by its uuid. Use only when you already know the uuid (e.g. from list_saved_profiles).",
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

  const renderProfileCard = betaZodTool({
    name: "render_profile_card",
    description:
      "Render a card UI for a specific saved profile. Use when discussing or referencing one person.",
    inputSchema: z.object({ uuid: z.string() }),
    run: ({ uuid }) => {
      const profile = profilesRepo.get(uuid);
      if (!profile) return JSON.stringify({ error: "Profile not found" });
      emit({
        type: "ui",
        id: randomUUID(),
        component: "ProfileCard",
        props: { profile },
      });
      return JSON.stringify({ status: "rendered", uuid });
    },
  });

  const renderProfileGrid = betaZodTool({
    name: "render_profile_grid",
    description:
      "Render a visual grid of multiple saved profiles. Provide the uuids in the order you want them shown. Use for list / show questions.",
    inputSchema: z.object({
      uuids: z.array(z.string()).min(1).max(50),
    }),
    run: ({ uuids }) => {
      const profiles = uuids
        .map((u) => profilesRepo.get(u))
        .filter((p): p is Profile => p !== undefined);
      if (profiles.length === 0) {
        return JSON.stringify({ error: "No matching profiles." });
      }
      emit({
        type: "ui",
        id: randomUUID(),
        component: "ProfileGrid",
        props: { profiles },
      });
      return JSON.stringify({ status: "rendered", count: profiles.length });
    },
  });

  const renderStatsBreakdown = betaZodTool({
    name: "render_stats_breakdown",
    description:
      "Render a bar chart of saved profiles distributed by a chosen field. Use for 'how many', 'by country/gender/age', or distribution questions.",
    inputSchema: z.object({
      field: z.enum(["country", "gender", "age_range"]),
    }),
    run: ({ field }) => {
      const profiles = profilesRepo.list();
      if (profiles.length === 0) {
        return JSON.stringify({ error: "No saved profiles to summarize." });
      }
      let title: string;
      let items: { label: string; count: number }[];

      if (field === "country") {
        const counts = new Map<string, number>();
        for (const p of profiles) {
          counts.set(
            p.location.country,
            (counts.get(p.location.country) ?? 0) + 1
          );
        }
        title = "Saved profiles by country";
        items = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));
      } else if (field === "gender") {
        const counts = new Map<string, number>();
        for (const p of profiles) {
          const g = p.gender || "unknown";
          counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        title = "Saved profiles by gender";
        items = [...counts.entries()].map(([label, count]) => ({
          label,
          count,
        }));
      } else {
        const buckets: Record<string, number> = {
          "0–19": 0,
          "20–29": 0,
          "30–39": 0,
          "40–49": 0,
          "50–59": 0,
          "60+": 0,
        };
        for (const p of profiles) {
          const a = p.dob.age;
          const key =
            a < 20
              ? "0–19"
              : a < 30
                ? "20–29"
                : a < 40
                  ? "30–39"
                  : a < 50
                    ? "40–49"
                    : a < 60
                      ? "50–59"
                      : "60+";
          buckets[key] = (buckets[key] ?? 0) + 1;
        }
        title = "Saved profiles by age range";
        items = Object.entries(buckets)
          .filter(([, c]) => c > 0)
          .map(([label, count]) => ({ label, count }));
      }

      emit({
        type: "ui",
        id: randomUUID(),
        component: "StatsBreakdown",
        props: { title, items },
      });
      return JSON.stringify({ status: "rendered", total: profiles.length });
    },
  });

  return [
    listSavedProfiles,
    getProfileByUuid,
    renderProfileCard,
    renderProfileGrid,
    renderStatsBreakdown,
  ];
}

chatRouter.post("/", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid chat request", issues: parsed.error.issues });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. Add it to apps/server/.env.",
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Tells nginx (and other reverse proxies that respect this header) not to
  // buffer the SSE response — without it, the client gets nothing until the
  // upstream stream ends, defeating the point of streaming.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const emit = (e: SseEvent) => {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
  };

  // Stop the (paid) Anthropic call if the client disconnects mid-response.
  // Listen on `res.on("close")`, NOT `req.on("close")` — the latter fires the
  // moment Express consumes the JSON body (in Node 18+), which is well before
  // the client has actually navigated away.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const runner = getClient().beta.messages.toolRunner(
      {
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: makeTools(emit),
        messages: parsed.data.messages.map(
          (m: ChatMessage): Anthropic.Beta.BetaMessageParam => ({
            role: m.role,
            content: m.content,
          })
        ),
        stream: true,
      },
      { signal: controller.signal }
    );

    for await (const messageStream of runner) {
      for await (const event of messageStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          emit({ type: "delta", text: event.delta.text });
        }
      }
    }

    emit({ type: "done" });
  } catch (err) {
    if (controller.signal.aborted) return;
    console.error(
      "[chat] error:",
      err instanceof Error ? err.message : String(err)
    );
    emit({
      type: "error",
      message: "Something went wrong. Please try again.",
    });
  } finally {
    res.end();
  }
});
