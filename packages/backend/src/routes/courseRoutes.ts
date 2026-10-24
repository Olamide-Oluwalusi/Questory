import { Router } from "express";
import type { CourseRepository } from "../services/courseRepository";
import type { EntitlementRepository } from "../services/entitlementRepository";
import { requireLevelAccess } from "../middleware/requireLevelAccess";

export function createCourseRouter(
  courses: CourseRepository,
  entitlements: EntitlementRepository,
  treasuryWallet: string
) {
  const router = Router();

  router.get(
    "/:courseId/levels/:levelId",
    requireLevelAccess({ courses, entitlements, treasuryWallet }),
    (_req, res) => {
      res.json({
        courseId: res.locals.course.id,
        level: res.locals.level
      });
    }
  );

  return router;
}
