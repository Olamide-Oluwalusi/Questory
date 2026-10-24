import { Router } from "express";
import { z } from "zod";
import { syllabusDraftRateLimit } from "../middleware/syllabusRateLimit";

const router = Router();

const draftSchema = z.object({
  prompt: z.string().trim().min(10).max(4000)
});

router.post("/syllabus/draft", syllabusDraftRateLimit, (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_PROMPT", details: parsed.error.flatten() });
    return;
  }

  // Local deterministic draft scaffold. Replace with a provider adapter when ready.
  // The rate limiter is deliberately applied before any future external LLM call.
  const topic = parsed.data.prompt.trim();
  res.json({
    status: "draft",
    topic,
    syllabus: [
      { order: 1, title: "Core concepts", objective: `Understand the foundations of ${topic}.` },
      { order: 2, title: "Guided practice", objective: `Apply ${topic} through a short interactive exercise.` },
      { order: 3, title: "Knowledge check", objective: `Demonstrate understanding of ${topic}.` }
    ],
    generationMode: "local-scaffold"
  });
});

router.post("/syllabus/generate", (_req, res) => {
  res.status(501).json({
    error: "HEAVY_GENERATION_NOT_CONFIGURED",
    message: "Approve a syllabus and connect a validated generation provider before enabling heavy generation."
  });
});

export default router;
