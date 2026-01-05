import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { createApp } from "./app";

async function main() {
  const port = Number(process.env.PORT ?? 3000);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI env var");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);

  const app = createApp();
  app.listen(port, () => {
    console.log(`✅ Backend listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
