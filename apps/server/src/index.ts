import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { profilesRouter } from "./routes/profiles.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(helmet());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/profiles", profilesRouter);
app.use("/api/chat", chatRouter);

// Last middleware: catch anything that escapes a route handler so we never
// leak Express's default HTML 500 page.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException", err);
  process.exit(1);
});
