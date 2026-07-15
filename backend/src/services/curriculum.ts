import { prisma } from "../prisma";

export type NextLessonResult =
  | { mode: "review"; lesson: Awaited<ReturnType<typeof prisma.lesson.findFirst>> }
  | { mode: "new"; lesson: Awaited<ReturnType<typeof prisma.lesson.findFirst>> }
  | { mode: "complete"; lesson: null };

// Revise anything flagged NEEDS_REVIEW before moving forward; otherwise take the
// next lesson in curriculum order that the student hasn't completed yet.
export async function determineNextLesson(studentId: string): Promise<NextLessonResult> {
  const needsReview = await prisma.progressLog.findFirst({
    where: { studentId, status: "NEEDS_REVIEW" },
    include: { lesson: true },
    orderBy: { lastAttemptAt: "asc" },
  });
  if (needsReview) {
    return { mode: "review", lesson: needsReview.lesson };
  }

  const completedLessonIds = (
    await prisma.progressLog.findMany({
      where: { studentId, status: "COMPLETED" },
      select: { lessonId: true },
    })
  ).map((l) => l.lessonId);

  const nextLesson = await prisma.lesson.findFirst({
    where: { id: { notIn: completedLessonIds } },
    orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
  });

  if (!nextLesson) {
    return { mode: "complete", lesson: null };
  }
  return { mode: "new", lesson: nextLesson };
}
