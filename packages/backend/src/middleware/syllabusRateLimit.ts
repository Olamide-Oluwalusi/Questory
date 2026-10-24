import rateLimit from "express-rate-limit";

export const syllabusDraftRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "SYLLABUS_RATE_LIMITED",
    message: "You can request up to 3 syllabus drafts every 15 minutes."
  }
});
