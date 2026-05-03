import "dotenv/config";
import express from "express";
import { profilesRouter } from "./routes/profiles.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/profiles", profilesRouter);
app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
