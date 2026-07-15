import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { determineNextLesson } from "../services/curriculum";

const router = Router();
router.use(requireAuth);

async function assertOwnsStudent(parentId: string, studentId: string) {
  const student = await prisma.student.findFirst({ where: { id: studentId, parentId } });
  return student !== null;
}

router.get("/:studentId", async (req: AuthedRequest, res) => {
  const { studentId } = req.params;
  if (!(await assertOwnsStudent(req.parentId!, studentId))) {
    return res.status(404).json({ error: "Student not found" });
  }

  const logs = await prisma.progressLog.findMany({
    where: { studentId },
    include: { lesson: true },
    orderBy: [{ lesson: { unit: { order: "asc" } } }, { lesson: { order: "asc" } }],
  });
  res.json(logs);
});

const upsertSchema = z.object({
  lessonId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NEEDS_REVIEW"]),
  understoodConfidence: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

router.post("/:studentId", async (req: AuthedRequest, res) => {
  const { studentId } = req.params;
  if (!(await assertOwnsStudent(req.parentId!, studentId))) {
    return res.status(404).json({ error: "Student not found" });
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { lessonId, status, understoodConfidence, notes } = parsed.data;

  const log = await prisma.progressLog.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: {
      status,
      understoodConfidence,
      notes,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
    create: {
      studentId,
      lessonId,
      status,
      understoodConfidence,
      notes,
      attempts: 1,
      lastAttemptAt: new Date(),
    },
  });

  res.json(log);
});

// Determines what the tutor should do next: revise the last lesson that wasn't
// marked COMPLETED/understood, or move on to the next lesson in curriculum order.
router.get("/:studentId/next-lesson", async (req: AuthedRequest, res) => {
  const { studentId } = req.params;
  if (!(await assertOwnsStudent(req.parentId!, studentId))) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json(await determineNextLesson(studentId));
});

export default router;
