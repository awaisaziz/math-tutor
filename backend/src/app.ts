import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import studentRoutes from "./routes/students";
import curriculumRoutes from "./routes/curriculum";
import progressRoutes from "./routes/progress";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/curriculum", curriculumRoutes);
  app.use("/api/progress", progressRoutes);

  return app;
}
