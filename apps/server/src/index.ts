import express from "express";
import { SHARED_PLACEHOLDER } from "@finq/shared";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, shared: SHARED_PLACEHOLDER });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] shared placeholder: ${SHARED_PLACEHOLDER}`);
});
