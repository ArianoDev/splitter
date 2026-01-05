import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";

import { calculationsRouter } from "./routes/calculations";
import { HttpError } from "./utils/httpError";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin ? corsOrigin.split(",").map((s) => s.trim()) : true,
      credentials: false,
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use("/api/calculations", calculationsRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "ValidationError",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }

    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: err.name,
        message: err.message,
        details: err.details ?? undefined,
      });
    }

    console.error(err);
    return res.status(500).json({ error: "InternalServerError" });
  });

  return app;
}
