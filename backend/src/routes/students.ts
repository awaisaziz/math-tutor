import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const studentSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(4).max(9),
});

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const student = await prisma.student.create({
    data: { ...parsed.data, parentId: req.parentId! },
  });

  res.status(201).json(student);
});

router.get("/", async (req: AuthedRequest, res) => {
  const students = await prisma.student.findMany({
    where: { parentId: req.parentId! },
    orderBy: { createdAt: "asc" },
  });
  res.json(students);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const student = await prisma.student.findFirst({
    where: { id: req.params.id, parentId: req.parentId! },
  });
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json(student);
});

export default router;
